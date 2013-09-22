// Dependencies ---------------------------------------------------------------
var Task = require('../lib/task/Task');


// Generate Task --------------------------------------------------------------
var generate = {

    mode: Task.Each,
    data: true,

    map: function(e, file) {
        return file;
    },

    run: function(e, done) {
        done(new Error('Task not implemented.'));
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

