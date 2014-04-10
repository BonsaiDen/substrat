// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    fs = require('fs.extra'),
    path = require('path'),
    FilePattern = require('file-pattern').Pattern,
    util = require('../util');


// Abstract Base Task ---------------------------------------------------------
function Task(name, pattern, handler, config, virtualWrite) {
    this._name = name;
    this._pattern = pattern ? FilePattern.toPattern(pattern) : null;
    this._handler = handler || {};
    this._mode = handler.mode || Task.Each;
    this._config = config || {};
    this._virtualWrite = !!virtualWrite;
    this._silent = false;
}


// Task Modes -----------------------------------------------------------------
Task.Each = 1;
Task.All = 2;
Task.Single = 4;


// Methods --------------------------------------------------------------------
util.inherit(Task, EventEmitter, {

    filterFiles: function() {
        return this._virtualWrite === true ? false : true;
    },

    allFiles: function() {
        return this._handler.allFiles === true;
    },

    matches: function(files) {
        return this._pattern === null ? true : this._pattern.matches(files);
    },

    run: function(substrat, mapper, options, files, silent) {

        this._silent = silent;

        if (files)  {
            this.log('Started for ' + files.length + ' file(s)...');

        } else {
            this.log('Started');
        }

        // Shortcuts
        var done = this.done.bind(this),
            handler = this._handler;

        // Task configuration
        var e = {
            substrat: substrat,
            config: this._config,
            options: options,
            virtualWrite: this._virtualWrite
        };

        // Switch out the read function with a stub in case we don't need the
        // file data for the task
        var read = this.reader(handler.data, mapper, e);

        // Run the task once for each file
        if (this._mode === Task.Each) {

            util.async(files, function(file, next) {

                read(file, function(err, data) {

                    if (err) {
                        done(err);

                    } else {
                        e.mapped = handler.map(e, file);
                        e.source = file;
                        e.data = data;
                        e.path = path.join(options.src, file);

                        mapper.update(file, e.mapped);
                        this.invoke(e, mapper, next);
                    }

                }, this);

            }, done, this);

        // Run the task once for all files at once
        } else if (this._mode === Task.All) {

            e.all = [];
            e.mapped = handler.map(e, this._config.file);

            util.async(files, function(file, next) {

                read(file, function(err, data) {

                    if (err) {
                        done(err);

                    } else {
                        e.all.push({
                            source: file,
                            path: path.join(options.src, file),
                            data: data
                        });
                        mapper.update(file, e.mapped);
                        next();
                    }

                });

            }, function(err) {
                err ? done(err) : this.invoke(e, mapper, done);

            }, this);

        // Run the task without and input file and generate mappings and output
        } else if (this._mode === Task.Single) {
            e.mapped = handler.map(e, this._config.file);
            mapper.virtual(e.mapped);
            this.invoke(e, mapper, done);

        } else {
            throw new Error('Unknown Taskmode: ' + this._mode);
        }

    },

    done: function(err) {

        if (err) {

            if (err.filename) {

                if (typeof err.line !== 'number') {
                    err.line = '??';
                }

                err.message = err.filename + '(' + err.line + '): ' + err.message;

            }

            var msg = ('[Error] ' + err.message).red +
                      '\n    ' + (err.stack ? (err.stack + '\n').yellow : '');
            this.log(msg, true);
        }

        this.emit('done', err);

    },

    invoke: function(e, mapper, done) {

        var writes = this.writes.bind(this),
            completed = false;

        this._handler.run(e, function(err, data) {

            completed = true;

            if (arguments.length > 2) {
                throw new Error('Too many arguments returned by task.');

            } else if (typeof done !== 'string' && (!done instanceof Array)) {
                throw new Error('Invalid data returned by task.');
            }

            if (err) {
                done(err);

            } else if (e.mapped && arguments.length > 1) {

                if (e.virtualWrite) {
                    mapper.virtual(e.mapped, data);
                    done();

                } else {
                    writes(e.options.dest, e.mapped, data, done);
                }

            } else {
                done();
            }

        });

    },


    // IO Helpers -------------------------------------------------------------
    log: function(msg, important) {
        if (!this._silent || important) {
            console.log(('[Task ' + this._name + ']').magenta, msg);
        }
    },

    reader: function(data, mapper, e) {
        if (typeof data === 'function' ? data(e) : !!data) {
            return this.read.bind(this, mapper, e.options.src);

        } else {
            return function(file, callback, scope) {
                callback.call(scope || null, null, null);
            };
        }
    },

    read: function(mapper, src, file, done, scope) {

        var source = path.join(src, file);
        if (mapper.hasVirtual(file)) {
            done.call(scope, null, mapper.readVirtual(file));

        } else {
            fs.readFile(source, function(err, data) {
                done.call(scope, err, data);
            });
        }

    },

    writes: function(dest, files, data, done) {

        files = files instanceof Array ? files : [files];
        data = data instanceof Array ? data : [data];

        util.parallel(files, function(file, index, complete) {
            this.write(dest, file, data[index], complete);

        }, done, this);

    },

    write: function(dest, file, data, done) {
        var target = path.join(dest, file);
        fs.mkdirp(path.dirname(target), function(err) {
            err ? done(err) : fs.writeFile(target, data, done);
        });
    }

});

module.exports = Task;

