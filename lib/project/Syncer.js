// Dependencies ---------------------------------------------------------------
var fs = require('fs.extra'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    util = require('../util');


// Source / Destination Syncer ------------------------------------------------
function Syncer(src, dest, silent) {
    this._src = src;
    this._dest = dest;
    this._silent = !!silent;
}


// Methods --------------------------------------------------------------------
util.inherit(Syncer, EventEmitter, {

    sync: function(files) {

        var walker = fs.walk(this._dest, {
            followLinks: false
        });

        walker.on('file', this._syncFiles.bind(this, files));
        walker.on('directories', this._syncDirectories.bind(this, files));
        walker.on('end', this._syncDone.bind(this));

        this.log('Syncing "' + this._dest + '" with "' + this._src + '"');

    },

    log: function(msg) {
        !this._silent && console.log('[Sync]'.yellow, msg);
    },

    error: function(err) {
        !this._silent && console.log('[Sync]'.yellow, '[Error]'.red, err.message.red);
    },


    // Internal ---------------------------------------------------------------
    _syncFiles: function(files, root, stat, next) {

        var name = path.join(root, stat.name).substring(this._dest.length + 1);
        if (files.indexOf(name) === -1) {
            this._removeFile(name, next);

        } else {
            next();
        }

    },

    _removeFile: function(name, next) {

        this.log('Removing "' + name + '" (source no longer exists)');

        fs.unlink(path.join(this._dest, name), (function(err) {
            err && this.error(err);
            next();

        }).bind(this));

    },

    _syncDirectories: function(files, root, stats, next) {

        stats.forEach((function(stat) {

            var name = path.join(root, stat.name).substring(this._dest.length + 1),
                exists = files.some(function(f) {
                    return f.substring(0, name.length) === name;
                });

            if (!exists) {
                this._removeDirectory(name, next);

            } else {
                next();
            }

        }).bind(this));

    },

    _removeDirectory: function(name, next) {

        this.log(('Removing "' + name + '/" (source no longer exists)'));

        fs.rmrf(path.join(this._dest, name), (function(err) {
            err && this.error(err);
            next();

        }).bind(this));

    },

    _syncDone: function() {
        this.emit('done');
    }

});

module.exports = Syncer;

