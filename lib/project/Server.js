// Dependencies ---------------------------------------------------------------
var fs = require('fs.extra'),
    http = require('http'),
    url = require('url'),
    send = require('send'),
    EventEmitter = require('events').EventEmitter,
    util = require('../util');


// Web Server with automatic reloading ----------------------------------------
function Server(dest, silent) {
    this._dest = dest;
    this._server = null;
    this._silent = !!silent;
    this._reloadResponse = null;
    this._index = null;
}


// Reload script that gets inserted into the index file -----------------------
Server.RELOAD_SCRIPT = 'window.onload = function() {'
                     + '\n    var reload = function() {'
                     + '\n        var xhr = new XMLHttpRequest()'
                     + '\n        xhr.open("GET", "%s");'
                     + '\n        xhr.onreadystatechange = function() {'
                     + '\n            if (xhr.readyState === 4) {'
                     + '\n                if (xhr.status === 200) {'
                     + '\n                    document.location.reload();'
                     + '\n                }'
                     + '\n            }'
                     + '\n        };'
                     + '\n        xhr.send();'
                     + '\n        setTimeout(function() {'
                     + '\n            console.log("bla");'
                     + '\n            xhr.abort();'
                     + '\n            reload();'
                     + '\n        }, 30000);'
                     + '\n    };'
                     + '\n    reload();'
                     + '\n};';


// Methods --------------------------------------------------------------------
util.inherit(Server, EventEmitter, {

    listen: function(indexUrl, port, host) {

        indexUrl = indexUrl ? this._dest + '/' + indexUrl : null;
        port = port || 8080;

        // Generate a "random" reload URL for the reloading script tag
        // that is patched into the index
        var reloadUrl = '/' + this._dest + '/substrat/reload/'
                      + Math.random() + '/'
                      + Math.random() + '.js';

        var that = this;
        this._server = http.createServer(function(req, res) {

            var p = url.parse(req.url).pathname;

            // Intercept the reload endpoint requests and delay them indefinitely.
            // The will be resolved once Server.reload() is called
            // triggering the page in the browser to call document.location.reload()
            if (p === reloadUrl) {
                that._reloadResponse = res;

            // Serve all other files
            } else {
                send(req, p).root(that._dest).on('file', function(path, stat) {

                    // In case of a file request splice in our custom handling
                    that._request.call(that, this, indexUrl, reloadUrl, path, stat);

                }).pipe(res);
            }

        });

        this._server.listen(port, host);

    },

    reload: function() {

        if (this._reloadResponse) {
            this.log('Reloading...');
            this._reloadResponse.statusCode = 200;
            this._reloadResponse.end();
            this._reloadResponse = null;
        }

    },

    stop: function() {
        this.emit('stop');
    },

    // Internal ---------------------------------------------------------------
    log: function(msg) {
        !this._silent && console.log('[Server]'.green, msg);
    },

    _request: function(send, indexUrl, reloadUrl, path, stat) {

        // Intercept index requests and patch in the reload script
        if (path === indexUrl) {

            this._patch(send, path, stat, function(html) {
                var index = html.lastIndexOf('</body>');
                return html.substring(0, index)
                     + '<script>'
                     + Server.RELOAD_SCRIPT.replace('%s', reloadUrl)
                     + '</script>'
                     + html.substring(index);
            });

        }

    },

    _patch: function(send, path, stat, callback) {
        // Patch the stream function of the send request
        var patched = this._stream.bind(send, path, stat, callback, send.stream);
        send.stream = patched;
    },

    _stream: function(path, options, callback, original) {

        // Undo the patching immediately so the next request
        // is not affected
        this.stream = original;

        // Read the file from disk and pass it through the callback
        // before actually responding
        var that = this,
            res = this.res,
            req = this.req;

        fs.readFile(path, function(err, data) {

            if (err) {
                if (res._header) {
                    //console.error(err.stack);
                    req.destroy();

                } else {
                    err.status = 500;
                    that.emit('error', err);
                }

            } else {
                data = callback(data.toString());
                res.setHeader('Content-Length', data.length);
                res.end(data);
                that.emit('end');
            }

        });

    }

});

module.exports = Server;

