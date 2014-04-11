// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    Watcher = require('./project/Watcher'),
    Syncer = require('./project/Syncer'),
    Server = require('./project/Server'),
    FileMapper = require('./file/Mapper'),
    FilePattern = require('file-pattern').Pattern,
    Task = require('./task/Task'),
    TaskQueue = require('./task/Queue'),
    List = require('./List'),
    util = require('./util');


// Global Dependencies --------------------------------------------------------
require('colors');


// Substrat -------------------------------------------------------------------
function Substrat(options) {

    // Default Options
    options = options || {};
    options.silent = !!options.silent || false;
    options.quiet = !!options.quiet || false;
    options.debug = !!options.debug || false;
    options.hidden = options.hidden === false ? false : true;
    options.excludePattern = options.excludePattern !== undefined ? options.excludePattern : /.*~$/;
    options.compress = !!options.compress;
    options.depends = options.depends || [];
    options.tasks = options.tasks || [];
    options.proxy = options.proxy || {};

    if (options.quiet) {
        options.silent = true;
    }

    // Components
    var debug = options.debug && !options.silent;
    this._watcher = new Watcher(options.src, options.hidden, options.excludePattern, !debug);
    this._syncer = new Syncer(options.src, options.dest, !debug);
    this._server = new Server(options.dest, options.proxy, options.cssReload, !debug);
    this._mapper = new FileMapper(!debug);
    this._queue = new TaskQueue(options.tasks, !debug);

    // Events
    this._watcher.on('file', this._trackFiles.bind(this));
    this._watcher.on('sync', this._initBuild.bind(this, true));

    // Properties
    this.options = options;

    // Build related
    this._buildStart = 0;
    this._buildLocalChanges = new List();
    this._buildChanges = {
        add: new List(),
        change: new List(),
        unlink: new List()
    };

    // If any of the tasks concat files we need to rebuild all files on every
    // change
    this._buildAll = options.tasks.some(function(t) {
        return t.allFiles();
    });

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
        this.once('done', this._server.stop.bind(this._server));
        this._server.listen(indexUrl, port, host);
        this._watcher.start();

        this.once('build', (function() {
            this.log('Listening on ' + (host || 'localhost') + ':' + port, true);

        }).bind(this));

        return this;

    },

    stop: function() {
        this._watcher.stop();
        this.emit('done');
        return this;
    },


    // Helpers ----------------------------------------------------------------
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

        this._buildLocalChanges.add({
            action: action,
            filepath: filepath
        });

    },

    _initBuild: function(initial, changedFiles) {

        if (this._buildAll) {
            changedFiles = this._mapper.files();

        } else {
            changedFiles = changedFiles || this._mapper.changes();
        }

        if (changedFiles.length) {

            if (initial) {
                this._buildStart = Date.now();
                this._buildChanges.add.clear();
                this._buildChanges.change.clear();
                this._buildChanges.unlink.clear();
                this.log('Building "' + this.options.src + '" to "' + this.options.dest + '" ...', true);
            }

            // Collect all files that changed during one build
            this._buildLocalChanges.each(function(m) {
                this._buildChanges[m.action].add(m.filepath);

            }, this);

            this._buildLocalChanges.clear();
            this._buildTasks(changedFiles);

        } else {
            this._buildSync();
        }

    },

    _buildTasks: function(changedFiles) {

        var that = this;

        this.log('Running ' + this.options.tasks.length + ' task(s) on ' + changedFiles.length + ' file(s)');
        this._watcher.pause();
        this._mapper.clear();

        this._queue.once('done', (function(err) {

            if (err) {
                this._buildFailed(err);

            } else {
                this._buildDependencies(changedFiles);
            }

        }).bind(this));

        // changedFiles also includes paths to unlinked files which need
        var filesToBuild = changedFiles.filter(function(filepath) {
            return that._mapper.exists(filepath);
        });

        this._queue.run(this, this._mapper, this.options, filesToBuild);

    },

    _buildDependencies: function(changedFiles) {

        var rebuildPatterns = [];
        this.options.depends.forEach(function(depend) {

            var isDependent = changedFiles.some(function() {
                return depend[1].some(function(p) {
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

    _buildFailed: function(err) {

        var duration = Math.round((Date.now() - this._buildStart) / 10) / 100;
        this.log(('Build failed after ' + duration + 's').red, true);

        this._mapper.clear();
        this._watcher.resume();

        this.emit('build', err, this._getChanges());

        this._mapper.clean();

    },

    _buildDone: function() {

        var duration = Math.round((Date.now() - this._buildStart) / 10) / 100;
        this.log('Build completed in ' + duration + 's', true);

        this._mapper.clear();
        this._watcher.resume();

        this.emit('build', null, this._getChanges());

        this._mapper.clean();

    },

    _getChanges: function() {

        var changes = {
            added: [],
            changed: [],
            removed: []
        };

        this._buildChanges.add.each(function(file) {
            this._mapper.mappings([file]).forEach(function(mapped) {
                changes.added.push(mapped);
            });

        }, this);

        this._buildChanges.change.each(function(file) {
            this._mapper.mappings([file]).forEach(function(mapped) {
                changes.changed.push(mapped);
            });

        }, this);

        this._buildChanges.unlink.each(function(file) {
            this._mapper.mappings([file]).forEach(function(mapped) {
                changes.removed.push(mapped);
            });

        }, this);

        return changes;

    },


    // Logging ----------------------------------------------------------------
    log: function(msg, highlight) {

        if (!highlight) {
            msg = msg.grey;
        }

        if (!this.options.silent || (highlight && !this.options.quiet)) {
            console.log('[Substrat]'.cyan, msg);
        }

    }

});

module.exports = Substrat;

