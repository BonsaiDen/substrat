// Dependencies ---------------------------------------------------------------
var less = require('less'),
    uglifyjs = require('uglify-js'),
    path = require('path'),
    Task = require('../lib/task/Task'),
    util = require('../lib/util');


// Built-in concators ---------------------------------------------------------
var types = {

    js: {

        mode: Task.All,

        data: function(e) {
            return !e.options.compress;
        },

        map: function(e, file) {

            if (e.options.compress) {
                return [e.config.file, e.config.file + '.map'];

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
                    sourceRoot: path.dirname(e.options.dest),
                    outSourceMap: path.basename(e.path)
                });

                done(null, [
                    m.code + '\n//@sourceMappingURL=' + e.mapped[1],
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

            var data = [];
            util.async(e.all, function(file, next) {

                var parser = new less.Parser({
                    paths: [e.options.src],
                    filename: file.source
                });

                parser.parse(file.data.toString(), function(err, tree) {

                    if (err) {
                        done(err);

                    } else {
                        data.push(tree.toCSS({
                            compress: e.options.compress
                        }));
                        next();
                    }

                });

            }, function() {
                done(null, data.join('\n\n'));
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

