// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    Watcher = require('./project/Watcher'),
    Syncer = require('./project/Syncer'),
    Server = require('./project/Server'),
    FileMapper = require('./file/Mapper'),
    FilePattern = require('./file/Pattern'),
    Task = require('./task/Task'),
    TaskQueue = require('./task/Queue'),
    l = require('./l'),
    util = require('./util');


// Global Dependencies --------------------------------------------------------
require('colors');


// Substrat -------------------------------------------------------------------
function Substrat(options) {

    options = options || {};
    options.silent = options.silent || false;
    options.debug = options.debug || false;
    options.compress = !!options.compress;
    options.depends = options.depends || [];
    options.tasks = options.tasks || [];

    this.options = options;

    var debug = options.debug && !options.silent;
    this._watcher = new Watcher(options.src, !debug);
    this._syncer = new Syncer(options.src, options.dest, !debug);
    this._server = new Server(options.dest, !debug);
    this._mapper = new FileMapper(!debug);
    this._queue = new TaskQueue(options.tasks, !debug);

    this._watcher.on('file', this._trackFiles.bind(this));
    this._watcher.on('sync', this._initBuild.bind(this, true));

}


// Statics --------------------------------------------------------------------
Substrat.pattern = FilePattern.toPattern;
Substrat.Task = Task;


// Methods --------------------------------------------------------------------
util.inherit(Substrat, EventEmitter, {

    // Public API -------------------------------------------------------------
    run: function() {
        this.watch();
        this.once('build', (function() {
            this.stop();
            this.emit('done');

        }).bind(this));
    },

    watch: function() {
        this._watcher.start();
    },

    listen: function(indexUrl, port, host) {
        this.on('build', this._server.reload.bind(this._server));
        this.once('stop', this._server.stop.bind(this._server));
        this._server.listen(indexUrl, port, host);
        this._watcher.start();
        this.log('Listening on port ' + port, true);
    },

    stop: function() {
        this._watcher.stop();
        this.emit('stop');
    },


    // Helpers ----------------------------------------------------------------
    pattern: function(expr) {
        return FilePattern.pattern(expr);
    },

    files: function(expr) {
        var files = this._mapper.mappings(this._mapper.files());
        return FilePattern.toPattern(expr).matches(files);
    },


    // Internal ---------------------------------------------------------------
    _trackFiles: function(action, filepath) {

        if (action === 'add') {
            this.log('+ '.green + filepath.grey);
            this._mapper.add(filepath);

        } else if (action === 'change')  {
            this.log('~ '.yellow + filepath.grey);
            this._mapper.update(filepath);

        } else if (action === 'unlink') {
            this.log('- '.red + filepath.grey);
            this._mapper.remove(filepath);
        }

    },

    _initBuild: function(initial, changedFiles) {

        changedFiles = changedFiles || this._mapper.changes();

        if (changedFiles.length) {
            initial && this.log('Building "' + this.options.src + '" to "' + this.options.dest + '" ...', true);
            this._buildTasks(changedFiles);

        } else {
            this._buildSync();
        }

    },

    _buildTasks: function(files) {
        this.log('Running ' + this.options.tasks.length + ' task(s) on ' + files.length + ' file(s)');
        this._watcher.pause();
        this._mapper.clear();
        this._queue.once('done', this._buildDependencies.bind(this, files));
        this._queue.run(this, this._mapper, this.options, files);
    },

    _buildDependencies: function(changedFiles) {

        var rebuildPatterns = [];
        l.each(this.options.depends, function(depend) {

            var isDependent = l.some(changedFiles, function() {
                return l.some(depend[1], function(p) {
                    return FilePattern.toPattern(p).matches(changedFiles).length > 0;
                });
            });

            if (isDependent) {
                rebuildPatterns.push(FilePattern.toPattern(depend[0]));
            }

        });

        if (rebuildPatterns.length) {
            var files = this._mapper.files(rebuildPatterns);
            this.log('Dependencies of ' + files.length + ' files(s) have changed');
            this._initBuild(false, files);

        } else {
            this._buildSync();
        }

    },

    _buildSync: function() {
        this.log('Synchronizing files...');
        this._syncer.once('done', this._buildDone.bind(this));
        this._syncer.sync(this._mapper.mappings(this._mapper.files()));
    },

    _buildDone: function() {
        this.log('Build complete', true);
        this._mapper.clear();
        this._watcher.resume();
        this.emit('build');
    },


    // Logging ----------------------------------------------------------------
    log: function(msg, highlight) {

        if (!highlight) {
            msg = msg.grey;
        }

        if (!this.options.silent || highlight) {
            console.log('[Substrat]'.cyan, msg);
        }

    }

});

module.exports = Substrat;

