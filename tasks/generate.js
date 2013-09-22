// Dependencies ---------------------------------------------------------------
var Task = require('../lib/task/Task');


// Generate Task --------------------------------------------------------------
var generate = {

    mode: Task.Single,
    data: false,

    map: function(e, file) {
        return file;
    },

    run: function(e, done) {

        if (typeof e.config.data === 'function') {
            done(null, e.name, e.config.data());

        } else if (typeof e.config.data === 'object'){
            done(null, e.name, JSON.stringify(e.config.data));

        } else {
            done(null, e.name, JSON.stringify(e.config.data));
        }

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(file, data) {
        return new Task('Generate: ' + file, null, generate, {
            file: file,
            data: data
        });
    }

};

