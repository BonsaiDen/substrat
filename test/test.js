var substrat = require('../index'),
    request = require('request'),
    http = require('http'),
    net = require('net'),
    fs = require('fs.extra');

// Helper ---------------------------------------------------------------------
function getPort(callback) {

    var server = net.createServer(),
        port = 0;

    server.on('listening', function() {
        port = server.address().port;
        server.close();
    });

    server.on('close', function() {
        callback(null, port);
    });

    server.listen(0);

}


// Test Patterns --------------------------------------------------------------
// ----------------------------------------------------------------------------
var files = [
    'style/main.less',
    'index.jade',
    'js/classes/B.js',
    'partials/form.jade',
    'lib/bootstrap/bootstrap.css',
    'js/classes/C.js',
    'lib/bootstrap/bootstrap.js',
    'js/classes/A.js',
    'lib/bootstrap/bootstrap.min.js',
    'js/app.js',
    'js/util.js',
    'style/fix.less',
    'js/config.js',
    'style/view.less'
];

exports.patterns = {

    fromString: function(test) {

        test.deepEqual(substrat.pattern('*.jade').matches(files), [
            'index.jade'
        ]);

        test.deepEqual(substrat.pattern('js/*.js').matches(files), [
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.deepEqual(substrat.pattern('lib/**/*.js').matches(files), [
            'lib/bootstrap/bootstrap.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.deepEqual(substrat.pattern('style/*.less').matches(files), [
            'style/main.less',
            'style/fix.less',
            'style/view.less'
        ]);

        test.deepEqual(substrat.pattern('js/classes/*').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js'
        ]);

        test.deepEqual(substrat.pattern('**/*.js').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    fromRegularExpression: function(test) {

        test.deepEqual(substrat.pattern(/.*\.jade/).matches(files), [
            'index.jade',
            'partials/form.jade'
        ]);

        test.deepEqual(substrat.pattern(/js\/.*\.js/).matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.deepEqual(substrat.pattern(/lib\/.*\/.*\.js/).matches(files), [
            'lib/bootstrap/bootstrap.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.deepEqual(substrat.pattern(/.*\.js/).matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    fromFunction: function(test) {

        function m(file) {
            return file.indexOf('classes') !== -1;
        }

        test.deepEqual(substrat.pattern(m).matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js'
        ]);

        test.done();

    },

    fromObject: function(test) {

        var obj = {
            string: 'js/*.js',
            regex: /.*\.less$/
        };

        test.deepEqual(substrat.pattern(obj).matches(files), [
            'style/main.less',
            'js/app.js',
            'js/util.js',
            'style/fix.less',
            'js/config.js',
            'style/view.less'
        ]);

        test.done();

    },

    fromArray: function(test) {

        var list = [
            /lib\/.*\.js/,
            'js/classes/*.js',
            /\.js$/
        ];

        test.deepEqual(substrat.pattern(list).matches(files), [
            'lib/bootstrap/bootstrap.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    last: function(test) {

        test.deepEqual(substrat.pattern(/\.js$/).last('js/util.js', 'js/config.js', 'js/app.js').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/util.js',
            'js/config.js',
            'js/app.js'
        ]);

        test.done();

    },

    first: function(test) {

        test.deepEqual(substrat.pattern(/\.js$/).first('js/util.js', 'js/config.js', 'js/app.js').matches(files), [
            'js/util.js',
            'js/config.js',
            'js/app.js',
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.done();

    },

    not: function(test) {

        test.deepEqual(substrat.pattern(/\.js$/).not('js/util.js', 'js/config.js', 'js/app.js').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.done();

    },

    all: function(test) {

        test.deepEqual(substrat.pattern('*').matches(files), [
            'style/main.less',
            'index.jade',
            'js/classes/B.js',
            'partials/form.jade',
            'lib/bootstrap/bootstrap.css',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/app.js',
            'js/util.js',
            'style/fix.less',
            'js/config.js',
            'style/view.less'
        ]);

        test.done();

    },

    multiMatch: function(test) {

        var p = substrat.pattern(/js\/[^\/]*\.js$/, /js\/.*\.js$/);
        test.deepEqual(p.matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        p = substrat.pattern('js/**/*.js', 'js/*.js');
        test.deepEqual(p.matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    combination: function(test) {

        var p = substrat.pattern(/js\/.*\.js$/).
                first('js/config.js').
                last('js/classes/**/*.js', 'js/util.js', 'js/app.js');

        test.deepEqual(p.matches(files), [
            'js/config.js',
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/util.js',
            'js/app.js'
        ]);

        test.done();

    }

};

function run(test, tasks, callback) {

    var sub = substrat.init({
        src: 'test/src',
        dest: 'test/public',
        quiet: true,
        tasks: tasks || []
    });

    fs.rmdir('./test/public', function(err) {

        sub.once('done', function() {

            var files = null,
                data = null;

            try {
                files = fs.readdirSync('test/public').sort();
                data = new Array(files.length);
                files.forEach(function(file, index) {
                    data[index] = fs.readFileSync('test/public/' + file).toString();
                });

            } catch(e) {
                files = [];
                data = [];
            }

            try {
                callback(files, data);
                test.done();

            } catch(err) {
                test.done(err);
            }

        });

        sub.run();

    });

    return sub;

}

exports.substrat = {

    init: function(test) {

        var sub = run(test, null, function() {
            test.strictEqual(typeof sub.run, 'function');
            test.strictEqual(typeof sub.watch, 'function');
            test.strictEqual(typeof sub.listen, 'function');
            test.strictEqual(typeof sub.stop, 'function');
            test.strictEqual(typeof sub.pattern, 'function');
            test.strictEqual(typeof sub.files, 'function');
        });

    }

};

exports.tasks = {

    compile: {

        js: function(test) {

            run(test, [substrat.task.compile(/\.js$/, 'js')], function(files, data) {

                test.deepEqual(files, ['test.js']);
                test.deepEqual(data, [
                    'function test(foo, bar) {\n    return foo + bar + 2;\n}\n'
                ]);

            });


        },

        jade: function(test) {

            run(test, [substrat.task.compile(/\.jade$/, 'jade')], function(files, data) {

                test.deepEqual(files, ['index.html']);
                test.deepEqual(data, [
                    '\n<html>\n  <head></head>\n  <body></body>\n</html>'
                ]);

            });

        },

        less: function(test) {

            run(test, [substrat.task.compile(/\.less$/, 'less')], function(files, data) {

                test.deepEqual(files, ['test.css']);
                test.deepEqual(data, [
                    '#test {\n  color: #ff0000;\n}\n.test {\n  color: #ff0000;\n}\n/*# sourceMappingURL=data:application/json,%7B%22version%22%3A3%2C%22sources%22%3A%5B%22test.less%22%5D%2C%22names%22%3A%5B%5D%2C%22mappings%22%3A%22AAEM%3BEACF%2CcAAA%3B%3BAAGE%3BEACF%2CcAAA%22%7D */'
                ]);

            });

        },

        markdown: function(test) {

            run(test, [substrat.task.compile(/\.md$/, 'markdown')], function(files, data) {

                test.deepEqual(files, ['test.html']);
                test.deepEqual(data, [
                    '<h2>Test</h2>\n\n<p>Test.</p>'
                ]);

            });

        }

    },

    concat: {

        js: function(test) {

            run(test, [substrat.task.concat(/\.js$/, 'js', 'all.js'),], function(files, data) {

                test.deepEqual(files, ['all.js']);
                test.deepEqual(data, [
                    'function test(foo, bar) {\n    return foo + bar + 2;\n}\n'
                ]);

            });

        },

        less: function(test) {

            run(test, [substrat.task.concat(/\.less$/, 'less', 'all.css')], function(files, data) {

                test.deepEqual(files, ['all.css']);
                test.deepEqual(data, [
                    '#test {\n  color: #ff0000;\n}\n.test {\n  color: #ff0000;\n}\n/*# sourceMappingURL=data:application/json,%7B%22version%22%3A3%2C%22sources%22%3A%5B%22input%22%5D%2C%22names%22%3A%5B%5D%2C%22mappings%22%3A%22AAEM%3BEACF%2CcAAA%3B%3BAAGE%3BEACF%2CcAAA%22%7D */',
                ]);

            });

        }

    },

    copy: function(test) {

        var tasks = [
            substrat.task.copy('*')
        ];

        run(test, tasks, function(files, data) {

            test.deepEqual(files, [
                'index.jade',
                'test.js',
                'test.json',
                'test.less',
                'test.md'
            ]);

            test.deepEqual(data, [
                'html\n  head\n\n  body\n',
                'function test(foo, bar) {\n    return foo + bar + 2;\n}\n',
                '{\n    "string": \'"{{{String}}}"\',\n    "object": "{{{Object}}}"\n}\n',
                '@red: #ff0000;\n\n#test {\n    color: @red;\n}\n\n.test {\n    color: @red;\n}\n\n',
                '## Test\n\nTest.\n'
            ]);

        });

    },

    template: function(test) {

        var tasks = [
            substrat.task.template('test.json', {
                Object: JSON.stringify({
                    test: 'test'
                }),
                String: 'Test'

            }, ['"{{', '}}"'])
        ];

        run(test, tasks, function(files, data) {

            test.deepEqual(data, [
                '{\n    "string": \'Test\',\n    "object": {"test":"test"}\n}\n'
            ]);
            test.deepEqual(files, ['test.json']);

        });

    }

};


function listen(test, tasks, requests, proxy, done) {

    var sub = substrat.init({
        src: 'test/src',
        dest: 'test/public',
        quiet: true,
        tasks: tasks || [],
        proxy: proxy || {}
    });

    var port = null;
    fs.rmdir('./test/public', function(err) {

        sub.once('build', function() {

            function next() {

                try {
                    var req = requests.shift();
                    if (req) {
                        var start = Date.now();
                        request(

                            'http://localhost:' + port + req.path,

                            function(err, response, body) {
                                if (err) {
                                    test.done(err);

                                } else {

                                    if (response.headers.hasOwnProperty('content-length')) {
                                        test.strictEqual(body.length, +response.headers['content-length'], 'Correct content length was served');
                                    }

                                    var delay = Date.now() - start;
                                    req.test(
                                        test, response.statusCode,
                                        response.headers, body, delay
                                    );

                                    next();

                                }
                            }

                        );

                    } else {
                        sub.stop();
                    }

                } catch(err) {
                    done && done();
                    test.done(err);
                }

            }

            next();

        });

        sub.once('done', function() {
            done && done();
            test.done();
        });

        getPort(function(err, p) {
            port = p;
            sub.listen('index.html', port);
        });

    });

    return sub;

}

exports.listen = {

    index: function(test) {

        var tasks = [
            substrat.task.compile(/\.js$/, 'js'),
            substrat.task.compile(/\.jade$/, 'jade'),
            substrat.task.compile(/\.less$/, 'less'),
            substrat.task.copy('*')
        ];

        listen(test, tasks, [{
            path: '',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 200);
                test.strictEqual(headers['content-type'], 'text/html; charset=UTF-8');
                test.ok(body.indexOf('Substrat Reload Handler') !== -1, 'index contains reload handler');
            }

        }, {
            path: '/',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 200);
                test.strictEqual(headers['content-type'], 'text/html; charset=UTF-8');
                test.ok(body.indexOf('Substrat Reload Handler') !== -1, 'index contains reload handler');
            }

        }, {
            path: '/index.html',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 200);
                test.strictEqual(headers['content-type'], 'text/html; charset=UTF-8');
                test.ok(body.indexOf('Substrat Reload Handler') !== -1, 'index contains reload handler');
            }

        }, {
            path: '/test.css',
            test: function(test, status, headers, body) {
                test.strictEqual(headers['content-type'], 'text/css; charset=UTF-8');
                test.strictEqual(status, 200);
                test.strictEqual(body, '#test {\n  color: #ff0000;\n}\n.test {\n  color: #ff0000;\n}\n/*# sourceMappingURL=data:application/json,%7B%22version%22%3A3%2C%22sources%22%3A%5B%22test.less%22%5D%2C%22names%22%3A%5B%5D%2C%22mappings%22%3A%22AAEM%3BEACF%2CcAAA%3B%3BAAGE%3BEACF%2CcAAA%22%7D */');
            }

        }, {
            path: '/test.js',
            test: function(test, status, headers, body) {
                test.strictEqual(headers['content-type'], 'application/javascript');
                test.strictEqual(status, 200);
                test.strictEqual(body, 'function test(foo, bar) {\n    return foo + bar + 2;\n}\n');
            }

        }, {
            path: '/test.md',
            test: function(test, status, headers, body) {
                test.strictEqual(headers['content-type'], 'text/x-markdown; charset=UTF-8');
                test.strictEqual(status, 200);
                test.strictEqual(body, '## Test\n\nTest.\n');
            }

        }, {
            path: '/foo',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }
        }]);

    }

};

exports.proxy = {

    path: function(test) {

        var tasks = [
            substrat.task.compile(/\.js$/, 'js'),
            substrat.task.compile(/\.jade$/, 'jade'),
            substrat.task.compile(/\.less$/, 'less'),
            substrat.task.copy('*')
        ];

        listen(test, tasks, [{
            path: '/proxy',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 200, 'Proxy index gets redirected on non-directory match');
                test.strictEqual(headers['content-type'], 'text/html; charset=UTF-8');
                test.ok(body.indexOf('Substrat Reload Handler') === -1, 'index contains reload handler');
            }

        }, {
            path: '/proxy/',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 200, 'Proxy index on directory index gets served correctly');
                test.strictEqual(headers['content-type'], 'text/html; charset=UTF-8');
                test.ok(body.indexOf('Substrat Reload Handler') === -1, 'index does not contain reload handler');
            }

        }, {
            path: '/proxy/index.html',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 200, 'Proxy index on index file gets served correctly');
                test.strictEqual(headers['content-type'], 'text/html; charset=UTF-8');
                test.ok(body.indexOf('Substrat Reload Handler') === -1, 'index contains reload handler');
            }

        }, {
            path: '/proxy/test.css',
            test: function(test, status, headers, body) {
                test.strictEqual(headers['content-type'], 'text/css; charset=UTF-8');
                test.strictEqual(status, 200);
                test.strictEqual(body, '#test {\n  color: #ff0000;\n}\n.test {\n  color: #ff0000;\n}\n/*# sourceMappingURL=data:application/json,%7B%22version%22%3A3%2C%22sources%22%3A%5B%22test.less%22%5D%2C%22names%22%3A%5B%5D%2C%22mappings%22%3A%22AAEM%3BEACF%2CcAAA%3B%3BAAGE%3BEACF%2CcAAA%22%7D */');
            }

        }, {
            path: '/proxy/test.js',
            test: function(test, status, headers, body) {
                test.strictEqual(headers['content-type'], 'application/javascript');
                test.strictEqual(status, 200);
                test.strictEqual(body, 'function test(foo, bar) {\n    return foo + bar + 2;\n}\n');
            }

        }, {
            path: '/proxy/test.md',
            test: function(test, status, headers, body) {
                test.strictEqual(headers['content-type'], 'text/x-markdown; charset=UTF-8');
                test.strictEqual(status, 200);
                test.strictEqual(body, '## Test\n\nTest.\n');
            }

        }, {
            path: '/proxy/foo',
            test: function(test, status, headers, body) {
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }], {
            '/proxy': {
                root: 'test/public'
            }
        });

    },

    delay: function(test) {

        var proxyFuncPath = null;
        listen(test, [], [{
            path: '/foo',
            test: function(test, status, headers, body, delay) {
                test.ok(delay < 50, 'No delay without proxy');
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }, {
            path: '/proxy/foo',
            test: function(test, status, headers, body, delay) {
                test.ok(delay < 50, 'No delay with delayless proxy');
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }, {
            path: '/delay/foo',
            test: function(test, status, headers, body, delay) {
                test.ok(delay >= 50, 'Delay exists with delayed proxy');
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }, {
            path: '/delay/func/foo',
            test: function(test, status, headers, body, delay) {
                test.ok(delay >= 150, 'Delay exists with function delayed proxy');
                test.strictEqual(proxyFuncPath, 'foo', 'Delay function got passed correct path');
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }], {

            '/proxy': {
                root: 'test/public'
            },

            '/delay/': {
                root: 'test/public',
                delay: 100
            },

            '/delay/func/': {
                root: 'test/public',
                delay: function(p) {
                    proxyFuncPath = p;
                    return 200;
                }
            }

        });

    },

    overlap: function(test) {

        listen(test, [], [{
            path: '/proxy/foo',
            test: function(test, status, headers, body, delay) {
                test.ok(delay < 50, 'Hits proxy without delay');
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }, {
            path: '/proxy/delay/foo',
            test: function(test, status, headers, body, delay) {
                test.ok(delay >= 90, 'Hits proxy with overlapping path and delay');
                test.strictEqual(status, 404);
                test.strictEqual(body, 'Not Found');
            }

        }], {

            '/proxy': {
                root: 'test/public'
            },

            '/proxy/delay/': {
                root: 'test/public',
                delay: 100
            }

        });

    },

    mock: function(test) {

        listen(test, [
            substrat.task.copy('*')

        ], [{
            path: '/proxy/mock/test.md',
            test: function(test, status, headers, body, delay) {
                test.strictEqual(status, 200);
                test.strictEqual(body, '## Test\n\nTest.\nfunction test(foo, bar) {\n    return foo + bar + 2;\n}\n@red: #ff0000;\n\n#test {\n    color: @red;\n}\n\n.test {\n    color: @red;\n}\n\n', 'Serves combined files from the mock array');
            }

        }], {

            '/proxy/mock/': {
                root: 'test/public',
                mock: {
                    'test.md': [
                        'test/public/test.md',
                        'test/public/test.js',
                        'test/public/test.less'
                    ]
                }
            }

        });

    },

    proxy: function(test) {

        getPort(function(err, port) {

            var proxyFuncPath = null,
                proxyHits = 0;

            // Create a server to proxy
            var s = http.createServer(function(req, res) {

                proxyHits++;
                res.writeHead(200, {
                    'Content-Type': 'text/plain'
                });

                res.end('Hello World\n');

            }).listen(port);

            listen(test, [], [{
                path: '/proxy/foo',
                test: function(test, status, headers, body, delay) {
                    test.ok(delay < 50, 'Hits proxy server without delay');
                    test.strictEqual(proxyHits, 1, 'Proxied server was hit');
                    test.strictEqual(status, 200);
                    test.strictEqual(body, 'Hello World\n');
                }

            }, {
                path: '/proxy/delay/foo',
                test: function(test, status, headers, body, delay) {
                    test.ok(delay > 90, 'Hits proxy server with delay');
                    test.strictEqual(proxyHits, 2, 'Proxied server was hit');
                    test.strictEqual(status, 200);
                    test.strictEqual(body, 'Hello World\n');
                }

            }, {
                path: '/proxy/delay/func/foo',
                test: function(test, status, headers, body, delay) {
                    test.ok(delay > 150, 'Hits proxy server with delay func');
                    test.strictEqual(proxyHits, 3, 'Proxied server was hit');
                    test.strictEqual(proxyFuncPath, 'foo', 'Delay function got passed correct path');
                    test.strictEqual(status, 200);
                    test.strictEqual(body, 'Hello World\n');
                }

            }], {

                '/proxy': {
                    host: 'localhost',
                    port: port
                },

                '/proxy/delay/': {
                    host: 'localhost',
                    port: port,
                    delay: 100
                },

                '/proxy/delay/func/': {
                    host: 'localhost',
                    port: port,
                    delay: function(p) {
                        proxyFuncPath = p;
                        return 200;
                    }
                }

            }, function() {
                s.close();
            });

        });

    }

};

