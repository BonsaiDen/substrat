// Dependencies ---------------------------------------------------------------
var Substrat = require('./lib/Substrat'),
    compile = require('./tasks/compile'),
    concat = require('./tasks/concat'),
    copy = require('./tasks/copy'),
    generate = require('./tasks/generate');


// Public API -----------------------------------------------------------------
module.exports = {

    init: function(options) {
        return new Substrat(options);
    },

    pattern: Substrat.pattern,

    task: {
        compile: compile.task,
        concat: concat.task,
        copy: copy.task,
        generate: generate.task
    }

};

