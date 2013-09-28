var l = {

    // Types
    type: function(i) {
        return Object.prototype.toString.call(i).slice(8, -1);
    },

    isArray: function(i) {
        return l.type(i) === 'Array';
    },

    isArguments: function(i) {
        return l.type(i) === 'Arguments';
    },

    isList: function(i) {
        return l.isArray(i) || l.isArguments(i);
    },


    // Conversions
    list: function(arg) {
        if (l.isList(arg)) {
            return Array.prototype.slice.call(arg);

        } else {
            return [arg];
        }
    },

    slice: function(arg) {
        return l.list(arg).slice();
    },


    // Higher order functions
    each: function(items, func, scope) {
        l.list(items).forEach(function() {
            func.apply(scope || null, arguments);
        });
    },

    map: function(items, func, scope) {
        return l.list(items).map(function() {
            return func.apply(scope || null, arguments);
        });
    },

    all: function(funcs, args, scope) {
        return l.list(funcs).every(function(f) {
            return f.apply(scope || null, args);
        });
    },

    any: function(funcs, args, scope) {
        args = l.list(args);
        return l.list(funcs).some(function(f) {
            return f.apply(scope || null, args);
        });
    },

    filter: function(items, func, scope) {
        var _ = l.list(func);
        return l.list(items).filter(function() {
            var args = arguments;
            return _.every(function(f) {
                return f.apply(scope || null, args);
            });
        });
    },

    some: function(items, func, scope) {
        return l.list(items).some(function() {
            return func.apply(scope || null, arguments);
        });
    },


    // Currying
    curry: function(func, args) {
        var _ = l.list(args);
        return function() {
            return func.apply(this, [_, l.list(arguments)]);
        };
    },


    // Objects
    keys: function(object) {
        return Object.keys(object);
    },

    values: function(object) {
        var _ = [];
        l.each(l.keys(object), function(key) {
            _.push(object[key]);
        });
        return _;
    },


    // In-place
    push: function(array, items) {
        l.isList(items) ? array.push.apply(array, l.list(items)) : array.push(items);
        return array;
    },

    add: function(array, items) {
        l.each(items, function(i) {
            if (array.indexOf(i) === -1) {
                array.push(i);
            }
        });
        return array;
    },

    remove: function(array, items) {
        l.each(items, function(i) {
            var _ = array.indexOf(i);
            if (_ !== -1) {
                array.splice(_, 1);
            }
        });
        return array;
    },


    // Filtering
    without: function(list, items) {
        return l.filter(list, function(i) {
            return items.indexOf(i) === -1;
        });
    },

    within: function(list, items) {
        return l.filter(list, function(i) {
            return items.indexOf(i) !== -1;
        });
    },


    // Splitting
    partition: function(items, filters, scope) {
        var _ = l.list(items);
        var p = l.list(filters).map(function(f) {
            var r = l.filter(_, f, scope);
            _ = l.without(_, r);
            return r;
        });
        p.push(_);
        return p;
    },

    flatten: function(items) {
        var _ = [];
        l.each(items, function(i) {
            if (l.isList(i)) {
                _.push.apply(_, l.flatten(i));

            } else if (i !== undefined) {
                _.push(i);
            }
        });
        return _;
    },


    // Comparison / matching
    is: function(value) {
        return function(item) {
            return item === value;
        };
    },

    isnt: function(value) {
        return function(item) {
            return item !== value;
        };
    },

    are: function(values) {
        // TODO directly return a l.all curry?
        return l.map(values, l.is);
    },

    arent: function(values) {
        // TODO directly return a l.all curry?
        return l.map(values, l.isnt);
    },

    matches: function(exps) {
        return l.map(exps, function(exp) {

            if (exp instanceof RegExp) {
                return function(item) {
                    return exp.test(item);
                };

            } else if (typeof exp === 'function') {
                return exp;
            }

        });
    }

};

module.exports = l;

