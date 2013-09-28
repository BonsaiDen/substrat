// Dependencies ---------------------------------------------------------------
var Task = require('../lib/task/Task'),
    mustache = require('mustache');


// Template Task --------------------------------------------------------------
var template = {

    mode: Task.Each,
    data: true,

    map: function(e, file) {
        return file;
    },

    run: function(e, done) {

        var locals;
        if (typeof e.config.data === 'function') {
            locals = e.config.data(e);

        } else {
            locals = e.config.data;
        }

        done(null, mustache.render(e.data.toString(), locals));

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(pattern, data) {
        return new Task('Template', pattern, template, {
            data: data
        });
    }

};

