// Dependencies ---------------------------------------------------------------
var less = require('less'),
    uglifyjs = require('uglify-js'),
    path = require('path'),
    Task = require('../lib/task/Task');


// Built-in concators ---------------------------------------------------------
var types = {

    js: {

        mode: Task.All,

        data: function(e) {
            return !e.options.compress;
        },

        map: function(e, file) {

            if (e.options.compress) {
                return [file, file + '.map'];

            } else {
                return file;
            }

        },

        run: function(e, done) {

            if (e.options.compress) {

                var sources = e.all.map(function(f) {
                    return f.path;
                });

                var m = uglifyjs.minify(sources, {
                    outSourceMap: path.basename(e.path)
                });

                // TODO copy source files so they can be found by the dev tools
                done(null, [
                    m.code + '\n//@ sourceMappingURL=' + path.basename(e.mapped[1])
                           + '\n//# sourceMappingURL=' + path.basename(e.mapped[1]),

                    m.map.toString()
                ]);

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
                    sourceMap: true,
                    compress: e.options.compress
                }));
            });

        }

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(pattern, type, file) {

        if (!types.hasOwnProperty(type)) {
            throw new Error('No concatenator found for type "' + type + '"');

        } else {
            return new Task('Concat: ' + type, pattern, types[type], {
                type: type,
                file: file
            });
        }

    }

};

