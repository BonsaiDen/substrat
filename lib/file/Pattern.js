// Dependencies ---------------------------------------------------------------
var l = require('../l'),
    minimatch = require('minimatch');


// File Pattern ---------------------------------------------------------------
function Pattern() {
    this._match = [];
    this._last = [];
    this._first = [];
    this._not = [];
    l.map(l.flatten(arguments), this.merge, this);
}


// Statics --------------------------------------------------------------------
Pattern.toExp = function(e) {

    if (e instanceof RegExp) {
        return e;

    } else if (typeof e === 'function') {
        return e;

    } else if (e === '*') {
        return (/^.*$/);

    } else {
        return minimatch.makeRe(e);
    }

};

Pattern.toPattern = function(expr) {

    if (!expr) {
        throw new Error('Invalid pattern expression.');

    } else if (expr instanceof Pattern) {
        return expr;

    } else if (expr.constructor === Object) {
        return new Pattern(l.values(expr));

    } else if (expr instanceof Array) {
        return new PatternGroup(expr);

    } else {
        return new Pattern(expr);
    }

};


// Methods --------------------------------------------------------------------
Pattern.prototype = {

    last: function() {
        l.push(this._last, l.map(arguments, Pattern.toExp));
        return this;
    },

    first: function() {
        l.push(this._first, l.map(arguments, Pattern.toExp));
        return this;
    },

    not: function() {
        l.push(this._not, l.map(arguments, Pattern.toExp));
        return this;
    },

    matches: function(files) {

        // Compiler the patterns
        var match = l.matches(this._match),
            not = l.matches(this._not),
            first = l.matches(this._first),
            last = l.matches(this._last);

        // Initial filtering of the files based on match and ignore
        files = files.filter(function(file) {
            return l.any(match, file) && !l.any(not, file);
        });

        // Partition the files based on the first and last patterns
        var parts = l.partition(files, [
            l.curry(l.any, first),
            l.curry(l.any, last)
        ]);

        // Recombine into one list and ensure to preserve order for first / last
        return l.flatten([
            this._sort(parts[0], first),
            parts[2],
            this._sort(parts[1], last)
        ]);

    },

    merge: function(expr) {

        if (!expr) {
            throw new Error('Invalid pattern expression.');

        } else if (expr instanceof Pattern) {
            this._match.push.apply(this._match, expr._match);
            this._first.push.apply(this._first, expr._first);
            this._last.push.apply(this._last, expr._last);
            this._not.push.apply(this._not, expr._not);

        } else {
            this._match.push(Pattern.toExp(expr));
        }

    },


    // Internal ---------------------------------------------------------------
    _sort: function(list, patterns) {

        var sorted = [];
        patterns.forEach(function(p) {
            sorted.push.apply(sorted, list.filter(function(file) {
                return p(file);
            }));
        });

        return sorted;

    }

};


// Pattern Group --------------------------------------------------------------
function PatternGroup(patterns) {
    this._pattern = l.map(patterns, Pattern.toPattern);
}


// Methods --------------------------------------------------------------------
PatternGroup.prototype = {

    matches: function(files) {

        files = l.list(files);
        return l.flatten(this._pattern.map(function(p) {
            var matched = p.matches(files);
            files = l.without(files, matched);
            return matched;
        }));

    }

};

module.exports = Pattern;

