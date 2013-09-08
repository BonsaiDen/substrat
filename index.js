// Dependencies ---------------------------------------------------------------
var path = require('path'),
    fs = require('fs.extra'),
    nodeStatic = require('node-static'),

    // Substrat
    compiler = require('./lib/compiler'),
    concator = require('./lib/concator'),
    Handler = require('./lib/Handler'),
    Watcher = require('./lib/Watcher'),
    util = require('./lib/util');


// Add color support to strings
require('colors');


// Exports --------------------------------------------------------------------
module.exports = function(options) {

    var fileTypeHandler = [],
        watcher = new Watcher(options.src),
        files = {},
        reload = function() {};

    files.$changed = true;


    // Option Defaults --------------------------------------------------------
    options.compress = !!options.compress;
    options.index = options.index || null;
    options.loaderUrl = options.loaderUrl || '/substrat/reload';
    options.loaderScript = options.loaderScript || ('<script src="' + options.loaderUrl + '"></script>');
    options.environment = options.environment || function(files, substrat) {
        return {
            files: files,
            substrat: substrat
        };
    };


    // Events -----------------------------------------------------------------
    watcher.on('sync', function() {

        console.log(('[Sync] '.yellow + options.dest.blue + ' -> ' + 'Cleanup'.yellow).bold);

        // Remove old files which no longer exist in the source
        var walker = fs.walk(options.dest, {
            followLinks: false
        });

        walker.on('directories', function(root, stats, next) {
            stats.forEach(function(stat) {

                var dir = path.join(root, stat.name).substring(options.dest.length + 1);
                fs.exists(path.join(options.src, dir), function(exists) {

                    if (!exists) {
                        console.log(' - Removing "' + dir + '" (source no longer exists)');
                        fs.rmdir(path.join(options.dest, dir), function(err) {
                            if (err) {
                                console.log('    - Error:', err.message.red);
                            }
                            next();
                        });

                    } else {
                        next();
                    }

                });
            });
        });

        walker.on('file', function(root, stat, next) {

            var name = path.join(root, stat.name).substring(options.dest.length + 1);
            if (files.all.indexOf(name) === -1) {
                console.log(' - Removing "' + name + '" (source no longer exists)');
                fs.unlink(path.join(options.dest, name), function(err) {
                    if (err) {
                        console.log('    - Error:', err.message.red);
                    }
                    next();
                });

            } else {
                next();
            }

        });

        walker.on('end', function() {
            console.log(' - Done\n');
        });

    });

    function processFile(action, filename, silent) {

        var handle,
            ext = path.extname(filename).substring(1);

        for(var i = 0, l = fileTypeHandler.length; i < l; i++) {

            var handler = fileTypeHandler[i],
                type = handler[0];

            // Standard String extensions or wildcard *
            if (typeof type === 'string' && (type === ext || type === '*')) {
                handle = handler[1](action, filename, options);
                break;

            // Regular Expression Matches
            } else if (type instanceof RegExp && type.test(filename)) {
                handle = handler[1](action, filename, options);
                break;
            }

        }

        if (handle && !silent) {
            handle.always(afterUpdate);
        }

        return handle;

    }

    watcher.on('file', processFile);


    // Update Files -----------------------------------------------------------
    var afterUpdate = util.wait(function() {

        var isReloading = false;
        if (files.$changed) {

            files.$changed = false;

            // Update the index file in case the file list has changed
            if (fs.existsSync(path.join(options.src, options.index))) {
                console.log(('[Index] '.yellow + options.index.cyan + ' -> ' + 'Update'.yellow).bold);
                processFile('change', options.index, true).always(function() {
                    reload();
                });
                isReloading = true;

            } else if (options.index) {
                console.log(('[Index] '.yellow + options.index.cyan + ' -> ' + 'Not Found'.red).bold);
            }

        }

        if (!isReloading) {
            reload();
        }

        // TODO Update concatenators

    }, 100);


    // Handler ----------------------------------------------------------------
    function compile(match, fileType) {

        if (typeof match === 'string') {
            fileType = match;

        } else if (!fileType) {
            throw new Error('Missing file type for compiler.');
        }

        fileTypeHandler.push([match, function(action, filename, options) {
            var c = compiler[fileType],
                env = options.environment(files, options.loaderScript);

            return new Handler(action, filename)
                    .add(c.name(options.compress, env))
                    .add(util.list(files, 'all'))
                    .add(util.list(files, fileType || '*'))
                    .compile(options.src, options.dest,
                             c.data(options.compress, env));
        }]);
    }

    function copy(match, fileType) {
        fileTypeHandler.push([match, function(action, filename, options) {
            return new Handler(action, filename)
                    .add(util.list(files, 'all'))
                    .add(util.list(files, fileType || '*'))
                    .copy(options.src, options.dest);
        }]);
    }

    function concat(match, fileType) {

        if (typeof match === 'string') {
            fileType = match;

        } else if (!fileType) {
            throw new Error('Missing file type for concator.');
        }

    }


    // Public API -------------------------------------------------------------
    return {

        compiler: compiler,
        concator: concator,

        listen: function(port) {

            port = port || 4444;
            watcher.start();

            // Development Server
            var server = new nodeStatic.Server(options.dest, {
                cache: false
            });

            require('http').createServer(function(req, res) {

                if (req.url === '/substrat/reload') {
                    reload = function() {
                        reload = function() {};
                        res.writeHead(200, {
                            'Content-Type': 'text/plain'
                        });
                        res.end('window.location.reload()\n');
                    };

                } else {
                    req.addListener('end', function() {
                        server.serve(req, res);

                    }).resume();
                }

            }).listen(port);

            console.log(('[Substrat] '.yellow + 'Started for ' + options.src.blue + '').bold + ' on port ' + ('' + port).blue + ' \n');

        },

        stop: function() {
            watcher.stop();
        },

        task: {
            compile: compile,
            concat: concat,
            copy: copy
        }

    };

};

