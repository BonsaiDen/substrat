// Dependencies ---------------------------------------------------------------
var fs = require('fs.extra'),
    http = require('http'),
    url = require('url'),
    EventEmitter = require('events').EventEmitter,
    crypto = require('crypto'),
    send = require('send'),
    httpProxy = require('http-proxy'),
    util = require('../util');


// Web Server with automatic reloading ----------------------------------------
function Server(dest, proxy, silent) {

    this._dest = dest;
    this._server = null;
    this._silent = false; //!!silent;

    // Proxy configuration
    this._proxy = proxy;
    this._proxyServer = new httpProxy.RoutingProxy();
    this._proxyExpr = new RegExp('^(' + Object.keys(this._proxy).map(function(key) {
        return key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    }).join('|') + ')(.*)');

    // Reload Handling
    this._reloadResponseList = [];

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

            // Intercept proxy request
            } else if (that._proxyExpr.test(p)) {
                var m = p.match(that._proxyExpr);
                that._proxyRequest(
                    req, res,
                    that._proxy[m[1]], url.parse(m[2] || '/').pathname
                );

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

    error: function(msg) {
        console.log('[Server] [Error]'.red, msg);
    },

    _request: function(send, indexUrl, path, stat) {

        // Intercept index requests and patch in the reload script
        if (path === indexUrl) {

            var script = Server.RELOAD_SCRIPT;
            script = script.replace('%reloadUrl', this._url.reload);
            script = script.replace('%initUrl', this._url.init);
            script = script.replace('%uid', this._uid);

            this._patch(send, path, stat, this._index.bind(this, script));

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
        callback.call(this, this.req, this.res, path);

    },

    _index: function(script, req, res, path) {

        var that = this;
        fs.readFile(path, function(err, data) {

            if (err) {
                if (res._header) {
                    req.destroy();

                } else {
                    err.status = 500;
                    that.emit('error', err);
                }

            } else {

                var html = data.toString(),
                    index = html.lastIndexOf('</body>');

                html = html.substring(0, index)
                     + '<script>' + script + '</script>'
                     + html.substring(index);

                res.setHeader('Content-Length', html.length);
                res.end(html);
                that.emit('end');

            }

        });

    },


    // Proxy Requests ---------------------------------------------------------
    _proxyRequest: function(req, res, proxy, path) {

        // Request delays
        var delay = 0;
        if (typeof proxy.delay === 'function') {
            delay = proxy.delay(path);

        } else if (proxy.delay) {
            delay = proxy.delay;
        }

        // Directory proxies
        if (proxy.hasOwnProperty('root')) {

            this.log('Proxy "' + path + '" to directory "' + proxy.root + '"');

            var that = this;
            send(req, path).root(proxy.root).on('file', function(p, stat) {
                that._mock.call(that, this, proxy, path, stat);

            }).pipe(res);

        // HTTP proxies
        } else if (proxy.hasOwnProperty('host')) {

            this.log('Proxy "' + path + '" to "' + proxy.host + ':' + proxy.port + '" delay()');
            if (proxy.delay) {
                setTimeout(this._proxyHttp.bind(
                    this, req, res,
                    proxy.host, proxy.port,
                    httpProxy.buffer(req)

                ), delay);

            } else {
                this._proxyHttp(req, res, proxy.host, proxy.port);
            }

        } else {
            this.error('Invalid proxy configuration');
        }

    },

    _proxyHttp: function(req, res, host, port, buffer) {
        this._proxyServer.proxyRequest(req, res, {
            host: host,
            port: port,
            buffer: buffer || null
        });
    },

    _mock: function(send, proxy, path, stat) {

        if (proxy.mock && proxy.mock.hasOwnProperty(path)) {

            var files = proxy.mock[path];
            files = Array.isArray(files) ? files : [files];

            this._patch(send, path, stat, this._mockFiles.bind(this, files));

        }

    },

    _mockFiles: function(files, req, res) {

        // Read all files, concatenate
        //res.setHeader('Content-Length', html.length);
        //res.end(html);
        //that.emit('end');

    }

});

module.exports = Server;

