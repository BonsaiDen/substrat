// Dependencies ---------------------------------------------------------------
var path = require('path'),
    less = require('less'),
    jade = require('jade'),
    uglifyjs = require('uglify-js'),
    util = require('./util');


// Built-in compilers ---------------------------------------------------------
module.exports = {

    js: {

        name: function(compress) {
            return function() {
                if (compress) {
                    this.filename = [
                        this.filename.replace(/\.js$/, '.min.js'),
                        this.filename + '.map'
                    ];
                }
                this.next();
            };
        },

        data: function(compress) {
            return function() {
                if (compress) {

                    this.log('Minifying js...');
                    var m = uglifyjs.minify(this.data, {
                        sourceRoot: path.dirname(this.filename[1]),
                        fromString: true,
                        outSourceMap: path.basename(this.filename[1])
                    });

                    this.data = [
                        m.code + '\n//@ sourceMappingURL=' + this.filename[1],
                        m.map.toString()
                    ];

                }

                this.next();

            };
        }

    },

    less: {

        name: function() {
            return function() {
                this.filename = this.filename.replace(/\.less$/, '.css');
                this.next();
            };
        },

        data: function(compress) {
            return function() {

                this.log('Compiling less...');

                var parser = new less.Parser({
                    filename: this.filename
                });

                var that = this;
                parser.parse(this.data, function(err, tree) {

                    if (err) {
                        that.done(err);

                    } else {
                        that.data = tree.toCSS({
                            compress: compress
                        });

                        that.next();
                    }

                });

            };
        }

    },

    jade: {

        name: function() {
            return function() {
                this.filename = this.filename.replace(/\.jade$/, '.html');
                this.next();
            };
        },

        data: function(compress, options) {
            return function() {

                this.log('Compiling jade...');

                try {
                    var locals = util.merge({
                        pretty: !compress

                    }, options);

                    this.data = jade.render(this.data, locals);
                    this.next();

                } catch(err) {
                    this.done(err);
                }

            };
        }

    }

};

