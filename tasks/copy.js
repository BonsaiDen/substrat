// Dependencies ---------------------------------------------------------------
var path = require('path'),
    fs = require('fs.extra'),
    Task = require('../lib/task/Task');


// Copy Task ------------------------------------------------------------------
var copy = {

    mode: Task.Each,
    data: false,

    map: function(e, file) {
        return file;
    },

    run: function(e, done) {

        var target = path.join(e.options.dest, e.name);
        fs.mkdirp(path.dirname(target), function() {

            // TODO prevent multiple calls to done
            var reader = fs.createReadStream(e.source);
            reader.on('error', function(err) {
                done(err);
            });

            var writer = fs.createWriteStream(target);
            writer.on('error', function(err) {
                done(err);
            });

            writer.on('close', function() {
                done(null);
            });

            reader.pipe(writer);

        });

    }

};


// Factory --------------------------------------------------------------------
module.exports = {

    task: function(pattern) {
        return new Task('Copy', pattern, copy);
    }

};

