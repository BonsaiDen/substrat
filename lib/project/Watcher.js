// Dependencies ---------------------------------------------------------------
var chokidar = require('chokidar'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    util = require('../util');


// File System Watcher --------------------------------------------------------
function Watcher(src, hidden, silent) {
    this._src = src;
    this._hidden = hidden;
    this._watcher = null;
    this._sync = null;
    this._queue = [];
    this._silent = !!silent;
    this._isPaused = false;
}


// Methods --------------------------------------------------------------------
util.inherit(Watcher, EventEmitter, {

    start: function() {

        this._watcher = chokidar.watch(this._src, {
            persistent: true
        });

        var ignored = /^\./;
        this._watcher.on('all', (function(action, filepath) {

            if (this._hidden && ignored.test(path.basename(filepath))) {
                return;

            } else if (this._isPaused) {
                this.log('[queued] [' + action + '] ' + filepath);
                this._queue.push([action, filepath]);

            } else {
                this._fileEvent(action, filepath);
            }

        }).bind(this));

        this._sync = util.throttle(function() {
            this.emit('sync');

        }, 350, this);

        this._sync();

        this.log('Start');
        this.emit('start');

    },

    pause: function() {
        this.log('Paused');
        this._isPaused = true;
    },

    resume: function() {

        this.log('Resumed');
        this._queue.forEach((function(event) {
            this._fileEvent.apply(this, event);

        }).bind(this));

        this._queue.length = 0;
        this._isPaused = false;

    },

    stop: function() {
        this._isPaused = false;
        this._queue.length = 0;
        this._watcher.close();
        this.log('Stop');
        this.emit('stop');
    },

    log: function(msg) {
        !this._silent && console.log('[Watch]'.blue, msg);
    },


    // Internal ---------------------------------------------------------------
    _sync: null,

    _fileEvent: function(action, filepath) {
        var filename = filepath.substring(this._src.length + 1);
        this.log('[' + action + '] ' + filepath);
        this.emit('file', action, filename);
        this._sync();
    }

});

module.exports = Watcher;

