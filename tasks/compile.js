// Dependencies ---------------------------------------------------------------
var path = require('path'),
    less = require('less'),
    jade = require('jade'),
    markdown = require('markdown'),
    uglifyjs = require('uglify-js'),
    Task = require('../lib/task/Task'),
    util = require('../lib/util');


// Built-in compilers ---------------------------------------------------------
var types = {

    js: {

        mode: Task.Each,

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

                if (e.options.sourceMaps !== false) {

                    var m = uglifyjs.minify(e.path, {
                        sourceRoot: path.dirname(e.options.dest),
                        outSourceMap: path.basename(e.path)
                    });

                    // TODO copy source files so they can be found by the dev tools
                    done(null, [
                        m.code + '\n//@ sourceMappingURL=' + path.basename(e.mapped[1])
                               + '\n//# sourceMappingURL=' + path.basename(e.mapped[1]),

                        m.map.toString()
                    ]);

                } else {
                    done(null, [uglifyjs.minify(e.path, {
                        compress: e.config.options.compress || {}

                    }).code]);
                }

            } else {
                done(null, e.data.toString());
            }

        }

    },

    less: {

        mode: Task.Each,
        data: true,

        map: function(e, file) {
            return file.replace(/\.less$/, '.css');
        },

        run: function(e, done) {

            var parser = new less.Parser({
                paths: [e.options.src],
                filename: e.source
            });

            var src = e.data.toString();
            if (e.config.pathPrefix) {
                src = src.replace(/url\(("|'|)/g, 'url($1' + e.config.pathPrefix);
            }

            parser.parse(src, function(err, tree) {
                done(err, err || tree.toCSS({
                    sourceMap: true,
                    compress: e.options.compress
                }));
            });

        }

    },

    jade: {

        mode: Task.Each,
        data: true,

        map: function(e, file) {
            return file.replace(/\.jade$/, '.html');
        },

        run: function(e, done) {

            try {
                var locals = util.merge(e.config, {
                    pretty: !e.options.compress,
                    substrat: e.substrat
                });

                done(null, jade.render(e.data.toString(), locals));

            } catch(err) {
                err.filename = e.source;
                done(err);
            }

        }

    },

    markdown: {

        mode: Task.Each,
        data: true,

        map: function(e, file) {
            return file.replace(/\.md$/, '.html');
        },

        run: function(e, done) {

            try {
                done(null, markdown.markdown.toHTML(e.data.toString()));

            } catch(err) {
                err.filename = e.source;
                done(err);
            }

        }

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(pattern, type, config) {

        if (!types.hasOwnProperty(type)) {
            throw new Error('No compiler found for type "' + type + '"');

        } else {
            return new Task('Compile: ' + type, pattern, types[type], config);
        }

    }

};

