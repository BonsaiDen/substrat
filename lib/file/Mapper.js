// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    List = require('../List'),
    util = require('../util');


// Source Mapper --------------------------------------------------------------
function Mapper(silent) {
    this._files = new List();
    this._virtual = new List();
    this._changed = new List();
    this._mapping = {};
    this._virtualData = {};
    this._silent = !!silent;
}


// Methods --------------------------------------------------------------------
util.inherit(Mapper, EventEmitter, {

    add: function(filepath) {
        if (this._files.add(filepath)) {
            this._files.sort(List.sortByLength);
            this._changed.add(filepath);
            this._mapping[filepath] = [];
            this.log('Added "' + filepath + '"');
        }
    },

    update: function(filepath, mappings) {
        if (this._files.contains(filepath)) {

            if (this._changed.add(filepath)) {
                this.log('Updated "' + filepath + '"');
            }

            if (Array.isArray(mappings)) {
                this._mapping[filepath] = mappings;

            } else {
                this._mapping[filepath] = [mappings];
            }

        }
    },

    exists: function(filepath) {
        return this._files.contains(filepath);
    },

    remove: function(filepath) {
        if (this._files.remove(filepath)) {
            this._changed.add(filepath);
            delete this._mapping[filepath];
            this.log('Removed "' + filepath + '"');
        }
    },

    virtual: function(filepath, data) {

        if (this._virtual.add(filepath)) {
            this.log('Added virtual "' + filepath + '"');
        }

        this._virtualData[filepath] = data;

        if (this._changed.add(filepath)) {
            this.log('Updated "' + filepath + '"');
        }

    },

    clear: function() {
        this._changed.clear();
    },

    hasVirtual: function(filepath) {
        return this._virtual.contains(filepath);
    },

    readVirtual: function(filepath) {
        return this._virtualData[filepath];
    },


    // Getters ----------------------------------------------------------------
    files: function(patterns) {

        var files = this._files.values();
        if (patterns) {
            return [].concat.apply([], patterns.map(function(p) {
                return p.matches(files);
            }));

        } else {
            return files;
        }

    },

    mappings: function(files) {

        var map = this._mapping,

            // Virtual files are always there
            mapped = this._virtual.values();

        files.forEach(function(f) {
            map[f].forEach(function(m) {

                // Prevent duplicates
                if (mapped.indexOf(m) === -1) {
                    mapped.push(m);
                }

            });
        });

        mapped.sort(List.sortByLength);
        return mapped;

    },

    changes: function() {
        return this._changed.values();
    },


    // Internal ---------------------------------------------------------------
    log: function(msg) {
        !this._silent && console.log('[Map]'.yellow, msg);
    }

});

module.exports = Mapper;

