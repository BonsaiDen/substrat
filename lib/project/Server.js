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
function Server(dest, proxy, cssReload, silent) {

    this._dest = dest;
    this._server = null;
    this._silent = !!silent;
    this._cssReload = cssReload === true ? true : false;

    // Proxy configuration
    this._proxy = proxy;
    this._proxies = {};

    var proxyKeys = Object.keys(this._proxy);
    if (proxyKeys.length) {

        // Sort by length and escape characters
        this._proxyExpr = new RegExp('^(' + proxyKeys.sort(function(a, b) {
            return b.length - a.length;

        }).map(function(key) {
            return key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        }).join('|') + ')(.*)');

    } else {
        this._proxyExpr = null;
    }


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

                that.log('Got reload request');

                that._reloadResponseList.push(res);
                req.on('close', function() {
                    that._reloadResponseList.splice(that._reloadResponseList.indexOf(res), 1);
                });

            // Intercept the init endpoint. In case substrat exits, the browser will
            // try to reconnect on this url
            } else if (p === that._url.init) {
                that.log('Got reload init');
                res.statusCode = 200;
                res.end('');

            // Intercept proxy request
            } else if (that._proxyExpr && that._proxyExpr.test(p)) {

                var m = p.match(that._proxyExpr),
                    key = m[1],
                    path = m[2];

                // Redirect to proxy root if the hit without a trailing "/"
                if (that._proxy.hasOwnProperty(key)
                    && path.substring(0, 1) !== '/'
                    && key.slice(-1) !== '/') {

                    that.log('Redirecting to "' + req.url + '/"');

                    res.statusCode = 301;
                    res.setHeader('Location', req.url + '/');
                    res.end('Redirecting to ' + req.url + '/');

                } else {

                    that.log('Got proxy request "' + path + '" for "' + key + '"');

                    that._proxyRequest(
                        req, res,
                        that._proxy[key], url.parse(path || '/').pathname
                    );
                }

            // Serve all other files
            } else {

                that.log('Serving "' + p + '"');

                send(req, p).root(that._dest).on('file', function(path, stat) {
                    that._request.call(that, this, indexUrl, path, stat);

                }).pipe(res);

            }

        });

        this._server.listen(port, host);

    },

    reload: function(err, changes) {

        if (this._reloadResponseList.length) {

            this.log('Reloading...');

            var that = this;
            this._reloadResponseList.slice().forEach(function(res) {

                res.statusCode = 200;
                res.end(JSON.stringify({
                    error: err ? err.toString() : null,
                    changes: that._cssReload ? changes : null
                }));

                that._reloadResponseList.splice(that._reloadResponseList.indexOf(res), 1);

            });

        }

    },

    stop: function() {
        this._reloadResponseList.length = 0;
        this._server.close();
        this.emit('stop');
    },


    // Internal ---------------------------------------------------------------
    log: function(msg) {
        !this._silent && console.log('[Server]'.green, msg);
    },

    error: function(msg) {
        console.log('[Server] [Error]'.red, msg);
    },

    _index: function(script, path, done) {

        fs.readFile(path, function(err, data) {

            if (err) {
                done(err);

            } else {

                var html = data.toString(),
                    index = html.lastIndexOf('</body>');

                done(null, html.substring(0, index)
                           + '<script>' + script + '</script>'
                           + html.substring(index));

            }

        });

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

        // Patch the stream function of the send request so we can modify
        // the data before it gets send to the client
        var original = send.stream;
        function patched() {

            send.stream = original;

            callback.call(send, path, function(err, data) {

                if (err) {
                    if (send.res._header) {
                        send.req.destroy();

                    } else {
                        err.status = 500;
                        send.emit('error', err);
                    }

                } else {
                    send.res.setHeader('Content-Length', Buffer.byteLength(data));
                    send.res.end(data);
                    send.emit('end');
                }

            });

        }

        send.stream = patched;

    },



    // Proxy Requests ---------------------------------------------------------
    _proxyRequest: function(req, res, proxy, path) {

        // Request delays
        var delay = 0;
        if (typeof proxy.delay === 'function') {
            delay = proxy.delay(path);

        } else if (proxy.delay) {
            delay = +proxy.delay;
        }

        // Directory proxies
        var that = this;
        if (proxy.hasOwnProperty('root')) {

            this.log('Proxying "' + path + '" to directory "'
                     + proxy.root + '" delay(' + delay + 'ms)');

            util.delay(function() {
                send(req, path).root(proxy.root).on('file', function(p, stat) {
                    that._mock.call(that, this, proxy, path, stat);

                }).pipe(res);

            }, delay, this);

        // HTTP proxies
        } else if (proxy.hasOwnProperty('host')) {

            var proxyId = proxy.host + ':' + proxy.port;
            if (!this._proxies.hasOwnProperty(proxyId)) {
                this._proxies[proxyId] = new httpProxy.createProxyServer({
                    target: {
                        host: proxy.host,
                        port: proxy.port
                    }
                });

                // Prevent socket hang up errors under Node.js 0.8
                // http-proxy will ALWAYS throw the error unless we add
                // our own custom handler here
                this._proxies[proxyId].on('error', function() {});

            }

            this.log('Proxying "' + path + '" to "'
                     + proxy.host
                     + ':' + proxy.port
                     + '" delay(' + delay + 'ms)');

            util.delay(function() {

                res.connection.on('end', function() {
                    that.log('Proxy request "' + path + '" served.');
                });

                this.log('Serving proxy request "' + path + '"...');
                this._proxies[proxyId].web(req, res);

            }, delay, this);

        } else {
            this.error('Invalid proxy configuration');
        }

    },

    _mock: function(send, proxy, path, stat) {

        if (proxy.mock && proxy.mock.hasOwnProperty(path)) {

            var files = proxy.mock[path];
            files = Array.isArray(files) ? files : [files];

            this.log('Mocking "' + path + '" with "' + files.join('", "') + '"');
            this._patch(send, path, stat, this._mockFiles.bind(send, files));

        }

    },

    _mockFiles: function(files, path, done) {

        var data = new Array(files.length);
        util.parallel(files, function(file, i, next) {

            fs.readFile(file, function(err, buffer) {
                if (err) {
                    next(err);

                } else {
                    data[i] = buffer.toString();
                    next();
                }
            });

        }, function(err) {
            done(err, data.join(''));

        }, this);

    }

});

module.exports = Server;

