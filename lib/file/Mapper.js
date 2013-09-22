// Dependencies ---------------------------------------------------------------
var EventEmitter = require('events').EventEmitter,
    List = require('./List'),
    l = require('../l'),
    util = require('../util');


// Source Mapper --------------------------------------------------------------
function Mapper(silent) {
    this._files = new List();
    this._virtual = new List();
    this._changed = new List();
    this._mapping = {};
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
            this._mapping[filepath] = l.list(mappings);
        }
    },

    remove: function(filepath) {
        if (this._files.remove(filepath)) {
            this._changed.remove(filepath);
            delete this._mapping[filepath];
            this.log('Removed "' + filepath + '"');
        }
    },

    virtual: function(filepath) {

        if (this._virtual.add(filepath)) {
            this.log('Added virtual "' + filepath + '"');
        }

        if (this._changed.add(filepath)) {
            this.log('Updated "' + filepath + '"');
        }

    },

    clear: function() {
        this._changed.clear();
    },


    // Getters ----------------------------------------------------------------
    files: function(patterns) {

        var files = this._files.values();
        if (patterns) {
            return l.flatten(l.map(patterns, function(p) {
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
