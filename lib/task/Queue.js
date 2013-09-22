// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    l = require('../l'),
    util = require('../util');


// Source Task Queue ----------------------------------------------------------
function Queue(tasks, silent) {
    this._tasks = tasks;
    this._silent = !!silent;
}


// Methods --------------------------------------------------------------------
util.inherit(Queue, EventEmitter, {

    run: function(substrat, mapper, options, files) {

        this.log('Running ' + this._tasks.length + ' Task(s)...');

        util.async(this._tasks, function(task, next) {

            var matches = task.matches(files);
            if (matches.length) {

                task.once('done', function() {
                    files = l.without(files, matches);
                    next();
                });
                task.run(substrat, mapper, options, matches, this._silent);

            } else if (matches === true) {
                task.once('done', next);
                task.run(substrat, mapper, options, null, this._silent);

            } else {
                next();
            }

        }, this.done, this);

    },

    done: function() {
        this.emit('done');
    },

    log: function(msg) {
        !this._silent && console.log('[Queue]'.blue, msg);
    }

});

module.exports = Queue;

