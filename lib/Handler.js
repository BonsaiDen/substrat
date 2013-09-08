// Dependencies ---------------------------------------------------------------
var path = require('path'),
    fs = require('fs.extra');

require('colors');


// Handler --------------------------------------------------------------------
function Handler(action, filename) {

    this.action = action;
    this.name = '';

    // Internal
    this._origin = filename;
    this._steps = [];
    this._index = -1;
    this._messages = [];

    this._success = null;
    this._error = null;
    this._always = null;

    // File data
    this.filename = filename;
    this.data = null;

    var that = this;
    process.nextTick(function() {
        that.next();
    });

}

Handler.prototype = {

    // Control ----------------------------------------------------------------
    add: function(callback) {

        if (this._index !== -1) {
            this._steps.splice(this._index + 1, 0, callback);

        } else {
            this._steps.push(callback);
        }

        return this;

    },

    next: function() {
        this._steps[++this._index].call(this);
    },

    done: function(err) {

        this._steps.length = 0;
        if (err) {
            this.error(err.message);
            this.report();
            this._promise(this._error);
            this._promise(this._always);

        } else {
            this.report();
            this._promise(this._success);
            this._promise(this._always);
        }

    },


    // Basic Promise-like Interface -------------------------------------------
    then: function(successCallback, errorCallback) {
        this._success = successCallback;
        this._error = errorCallback;
        return this;
    },

    always: function(callback) {
        this._always = callback;
        return this;
    },

    _promise: function(func) {
        if (func) {
            process.nextTick(function() {
                func();
            });
        }
    },


    // Logging ----------------------------------------------------------------
    report: function() {

        var color = {
            add: 'green',
            unlink: 'red',
            change: 'yellow'

        }[this.action];

        var head = ('[' + this.action + '] ')[color] + this._origin.cyan + ' -> ' + this.name;
        console.log(head.bold + '\n' + this._messages.map(function(msg) {
            return ' - ' + msg;

        }).join('\n') + '\n');

    },

    log: function() {
        this._log(arguments, false);
    },

    error: function() {
        this._log(arguments, true);
    },

    _log: function(args, error) {
        var msg = Array.prototype.slice.call(args).join(' ');
        this._messages.push(error ? msg.red : msg);
    },


    // Handlers ---------------------------------------------------------------

    // file().compiler().write();
    compile: function(src, dest, compiler) {

        this.name = 'Compile'.yellow;
        this.file(src, dest);
        this.add(compiler);
        this.write(dest);

        return this;

    },

    // file().write();
    copy: function(src, dest) {

        this.name = 'Copy'.yellow;
        this.file(src, dest);
        this.write(dest);

        return this;

    },

    // read() or unlink() based on action
    file: function(src, dest) {

        var that = this;
        this.add(function() {

            if (that.action === 'add' || that.action === 'change') {
                that.read(src);
                that.next();

            } else if (that.action === 'unlink') {
                that.unlink(dest);
                that.next();
            }

        });

    },

    // Reads a file from disk
    read: function(src, modifier) {

        var that = this;
        this.add(function() {

            if (!src) {
                that.done(new Error('read(): No source specified.'));

            } else {

                var file = path.join(src, that._origin);
                that.log('Reading "' + file + '"...');

                fs.readFile(file, {
                    encoding: 'utf8'

                }, function(err, data) {
                    if (err) {
                        that.done(err);

                    } else if (modifier) {
                        modifier(data, function(data) {
                            that.data = data;
                            that.next();
                        });

                    } else {
                        that.data = data;
                        that.next();
                    }
                });

            }

        });

        return this;

    },

    // Write a file to disk, ends the chain
    write: function(dest, modifier) {

        var that = this;
        function writeFile(filename, data, done) {

            if (!dest) {
                done(new Error('write(): No destination specified.'));

            } else {

                var file = path.join(dest, filename);
                that.log('Writing "' + file + '"...');

                fs.mkdirp(path.dirname(file), function(err) {
                    if (err) {
                        done(err);

                    } else {
                        fs.writeFile(file, data, function(err) {
                            done(err);
                        });
                    }
                });

            }

        }

        function write(data) {
            if (typeof that.filename === 'string') {
                writeFile(that.filename, data, function(err) {
                    that.done(err);
                });

            } else if (that.filename instanceof Array) {

                var count = that.filename.length,
                    writeNext = function(err) {
                        count--;
                        if (err) {
                            that.done(err);

                        } else if (count === 0) {
                            that.done();
                        }
                    };

                that.filename.forEach(function(filename, i) {
                    writeFile(filename, data[i], writeNext);
                });

            }
        }

        this.add(function() {
            if (modifier) {
                modifier(that.data, function(data) {
                    writeFile(data);
                });

            } else {
                write(that.data);
            }
        });

        return this;

    },

    // Write a file to disk, ends the chain
    unlink: function(dest) {

        var that = this;
        this.add(function() {

            var file = path.join(dest, that.filename);

            that.name = 'Unlink'.red;
            that.log('Removing "' + file + '"...');

            fs.stat(file, function(err, s) {
                if (err) {
                    that.done(err);

                } else if (s.isDirectory()) {
                    fs.rmdir(file, function(err) {
                        that.done(err);
                    });

                } else if (s.isFile()) {
                    fs.unlink(file, function(err) {
                        that.done(err);
                    });
                }

            });

        });

        return this;

    }

};

module.exports = Handler;

