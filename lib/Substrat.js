// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    Watcher = require('./project/Watcher'),
    Syncer = require('./project/Syncer'),
    Server = require('./project/Server'),
    FileMapper = require('./file/Mapper'),
    FilePattern = require('./file/Pattern'),
    Task = require('./task/Task'),
    TaskQueue = require('./task/Queue'),
    List = require('./List'),
    l = require('./l'),
    util = require('./util');


// Global Dependencies --------------------------------------------------------
require('colors');


// Substrat -------------------------------------------------------------------
function Substrat(options) {

    options = options || {};
    options.silent = !!options.silent || false;
    options.debug = !!options.debug || false;
    options.hidden = options.hidden === false ? false : true;
    options.compress = !!options.compress;
    options.depends = options.depends || [];
    options.tasks = options.tasks || [];

    this.options = options;

    var debug = options.debug && !options.silent;
    this._watcher = new Watcher(options.src, options.hidden, !debug);
    this._syncer = new Syncer(options.src, options.dest, !debug);
    this._server = new Server(options.dest, !debug);
    this._mapper = new FileMapper(!debug);
    this._queue = new TaskQueue(options.tasks, !debug);

    this._watcher.on('file', this._trackFiles.bind(this));
    this._watcher.on('sync', this._initBuild.bind(this, true));

    this._buildChanges = new List();
    this._buildStart = 0;

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

        return this;

    },

    watch: function() {
        this._watcher.start();
        return this;
    },

    listen: function(indexUrl, port, host) {

        this.on('build', this._server.reload.bind(this._server));
        this.once('stop', this._server.stop.bind(this._server));
        this._server.listen(indexUrl, port, host);
        this._watcher.start();

        this.once('build', (function() {
            this.log('Listening on ' + (host || 'localhost') + ':' + port, true);

        }).bind(this));

        return this;

    },

    stop: function() {
        this._watcher.stop();
        this.emit('stop');
        return this;
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

            if (initial) {
                this._buildStart = Date.now();
                this._buildChanges.clear();
                this.log('Building "' + this.options.src + '" to "' + this.options.dest + '" ...', true);
            }

            // Collect all files that changed during one build
            this._buildChanges.append(changedFiles);
            this._buildTasks(changedFiles);

        } else {
            this._buildSync();
        }

    },

    _buildTasks: function(changedFiles) {

        this.log('Running ' + this.options.tasks.length + ' task(s) on ' + changedFiles.length + ' file(s)');
        this._watcher.pause();
        this._mapper.clear();

        // changedFiles also includes paths to unlinked files which need
        var filesToBuild = l.filter(changedFiles, function(filepath) {
            return this._mapper.exists(filepath);

        }, this);

        this._queue.once('done', this._buildDependencies.bind(this, changedFiles));
        this._queue.run(this, this._mapper, this.options, filesToBuild);

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

        var duration = Math.round((Date.now() - this._buildStart) / 10) / 100;
        this.log('Build completed in ' + duration + 's', true);

        this._mapper.clear();
        this._watcher.resume();
        this.emit('build', this._buildChanges.values());

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

