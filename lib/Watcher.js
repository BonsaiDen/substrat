// Dependencies ---------------------------------------------------------------
var chokidar = require('chokidar'),
    EventEmitter = require('events').EventEmitter,
    util = require('./util');


// File System Watcher --------------------------------------------------------
function Watcher(src) {
    this.src = src;
    this.backend = null;
}

Watcher.prototype = Object.create(EventEmitter.prototype);

util.merge(Watcher.prototype, {

    start: function() {

        // Setup Watcher
        var that = this;
        this.backend = chokidar.watch(this.src, {
            ignored: /^\./,
            persistent: true
        });

        // Emit Event when initial sync is complete
        var initialSync = util.wait(function() {
            that.emit('sync');

        }, 350);

        // Watch Files
        this.backend.on('all', function(action, filepath) {

            var filename = filepath.substring(that.src.length + 1);
            that.emit('file', action, filename);
            initialSync();

        });

    },

    stop: function() {
        this.backend.close();
        this.emit('stop');
    }

});

module.exports = Watcher;

