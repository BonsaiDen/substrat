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

        try {
            var template = mustache.compile(e.data.toString(), e.config.tags);
            done(null, template(locals));

        } catch(err) {
            err.filename = e.source || '';
            done(err);
        }

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(pattern, data, tags, virtual) {
        return new Task('Template', pattern, template, {
            data: data,
            tags: tags || mustache.tags

        }, virtual);
    }

};

