// Dependencies ---------------------------------------------------------------
var fs = require('fs.extra'),
    http = require('http'),
    url = require('url'),
    EventEmitter = require('events').EventEmitter,
    crypto = require('crypto'),
    send = require('send'),

    util = require('../util');


// Web Server with automatic reloading ----------------------------------------
function Server(dest, silent) {

    this._dest = dest;
    this._server = null;
    this._silent = !!silent;
    this._reloadResponseList = [];

    // Create a unique (on a per project basis) id for browser reload handling
    var hash = crypto.createHash('md5');
    hash.update(process.cwd() + '#' + __dirname);

    this._uid = hash.digest().toString('hex');
    this._url = {
        init: '/substrat/init/' + this._uid + '.js',
        reload: '/substrat/reload/' + this._uid + '.js'
    };

}


// Reload script that gets inserted into the index file -----------------------
Server.RELOAD_SCRIPT = fs.readFileSync(__dirname + '/browser.js').toString();


// Methods --------------------------------------------------------------------
util.inherit(Server, EventEmitter, {

    listen: function(indexUrl, port, host) {

        indexUrl = indexUrl ? this._dest + '/' + indexUrl : null;
        port = port || 8080;

        var that = this;
        this._server = http.createServer(function(req, res) {

            var p = url.parse(req.url).pathname;

            // Intercept the reload endpoint requests and delay them indefinitely.
            // The will be resolved once Server.reload() is called
            // triggering the page in the browser to call document.location.reload()
            if (p === that._url.reload) {
                that._reloadResponseList.push(res);

            // Intercept the init endpoint. In case substrat exits, the browser will
            // try to reconnect on this url
            } else if (p === that._url.init) {
                res.statusCode = 200;
                res.end('');

            // Serve all other files
            } else {
                send(req, p).root(that._dest).on('file', function(path, stat) {

                    // In case of a file request splice in our custom handling
                    that._request.call(that, this, indexUrl, path, stat);

                }).pipe(res);
            }

        });

        this._server.listen(port, host);

    },

    reload: function(changes) {

        if (this._reloadResponseList) {
            this.log('Reloading...');
            this._reloadResponseList.forEach(function(res) {
                res.statusCode = 200;
                res.end(JSON.stringify(changes));
            });
            this._reloadResponseList.length = 0;
        }

    },

    stop: function() {
        this._reloadResponseList.length = 0;
        this.emit('stop');
    },


    // Internal ---------------------------------------------------------------
    log: function(msg) {
        !this._silent && console.log('[Server]'.green, msg);
    },

    _request: function(send, indexUrl, path, stat) {

        // Intercept index requests and patch in the reload script
        if (path === indexUrl) {

            var script = Server.RELOAD_SCRIPT;
            script = script.replace('%reloadUrl', this._url.reload);
            script = script.replace('%initUrl', this._url.init);
            script = script.replace('%uid', this._uid);

            this._patch(send, path, stat, function(html) {
                var index = html.lastIndexOf('</body>');
                return html.substring(0, index)
                     + '<script>' + script + '</script>'
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

