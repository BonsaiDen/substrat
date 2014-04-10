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

        var dest = path.join(e.options.dest, e.mapped);
        fs.mkdirp(path.dirname(dest), function() {

            var reader = fs.createReadStream(e.path);
            reader.on('error', function(err) {
                err.filename = e.path;
                done(err);
            });

            var writer = fs.createWriteStream(dest);
            writer.on('error', function(err) {
                err.filename = e.path;
                done(err);
            });

            writer.on('close', function(err) {
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

