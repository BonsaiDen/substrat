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

            var oldTags = mustache.tags;
            mustache.tags = e.config.tags;

            var rendered = mustache.render(e.data.toString(), locals);
            mustache.tags = oldTags;

            done(null, rendered);

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

