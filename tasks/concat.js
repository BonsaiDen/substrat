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
                return [file.replace(/\.js$/, '.min.js'), file + '.map'];

            } else {
                return file;
            }

        },

        run: function(e, done) {

            if (e.options.compress) {

                var sources = e.all.map(function(f) {
                    return f.source.toString();
                });

                var m = uglifyjs.minify(sources, {
                    sourceRoot: path.dirname(e.options.dest),
                    outSourceMap: path.basename(e.source)
                });

                done(null, e.name, [
                    m.code + '\n//@ sourceMappingURL=' + e.name[1],
                    m.map.toString()
                ]);

            } else {

                var data = e.all.map(function(f) {
                    return f.data.toString();
                });

                done(null, e.name, data.join('\n\n;'));

            }

        }

    },

    less: {

        mode: Task.All,
        data: true,

        map: function(e, file) {
            return file.replace(/\.less$/, '.css');
        },

        run: function(e, done) {
            done(null, e.name, '');
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

