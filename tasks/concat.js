// Dependencies ---------------------------------------------------------------
var less = require('less'),
    jade = require('jade'),
    uglifyjs = require('uglify-js'),
    path = require('path'),
    Task = require('../lib/task/Task'),
    util = require('../lib/util');


// Built-in concators ---------------------------------------------------------
var types = {

    js: {

        mode: Task.All,
        allFiles: true,

        data: function(e) {
            return !e.options.compress;
        },

        map: function(e, file) {

            if (e.options.compress) {
                if (e.options.sourceMaps !== false) {
                    return [file, file + '.map'];

                } else {
                    return [file];
                }

            } else {
                return file;
            }

        },

        run: function(e, done) {

            if (e.options.compress) {

                var sources = e.all.map(function(f) {
                    return f.path;
                });

                if (e.options.sourceMaps !== false) {

                    var m = uglifyjs.minify(sources, {
                        outSourceMap: path.basename(e.path)
                    });
                    var map = + '\n//@ sourceMappingURL=' + path.basename(e.mapped[1])
                              + '\n//# sourceMappingURL=' + path.basename(e.mapped[1]);

                    done(null, [
                        m.code + map,
                        m.map.toString()
                    ]);

                } else {
                    done(null, [uglifyjs.minify(sources).code]);
                }

            } else {

                var data = e.all.map(function(f) {
                    return f.data.toString();
                });

                done(null, data.join('\n\n;'));

            }

        }

    },

    less: {

        mode: Task.All,
        data: true,
        allFiles: true,

        map: function(e) {
            return e.config.file;
        },

        run: function(e, done) {

            var data = e.all.map(function(f) {
                return f.data.toString();
            });

            var parser = new less.Parser({
                paths: [e.options.src]
            });

            // TODO support source maps
            parser.parse(data.join('\n\n'), function(err, tree) {
                done(err, err || tree.toCSS({
                    sourceMap: e.options.sourceMaps !== false ? true : false,
                    compress: e.options.compress
                }));
            });

        }

    },

    jade: {

        mode: Task.All,
        data: true,
        allFiles: true,

        map: function(e) {
            return e.config.file;
        },

        run: function(e, done) {

            var map = {};
            for(var i = 0, l = e.all.length; i < l; i++) {

                var raw = e.all[i].data.toString(),
                    path = e.all[i].source.replace(/\.jade$/, '.html');

                if (e.config.options.prefix) {
                    path = e.config.options.prefix + path;
                }

                try {

                    var locals = util.merge(e.config.options.config, {
                        pretty: !e.options.compress,
                        substrat: e.substrat
                    });

                    map[path] = jade.render(raw, locals).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                } catch(err) {
                    return done(err);
                }

            }

            done(null, e.config.options.template.replace('%s', JSON.stringify(map)));

        }

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(pattern, type, file, options) {

        if (!types.hasOwnProperty(type)) {
            throw new Error('No concatenator found for type "' + type + '"');

        } else {
            return new Task('Concat: ' + type, pattern, types[type], {
                type: type,
                file: file,
                options: options
            });
        }

    }

};

