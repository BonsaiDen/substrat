var util = {

    extend: function(object, props) {
        for(var key in props) {
            if (props.hasOwnProperty(key)) {
                object[key] = props[key];
            }
        }
    },

    merge: function() {

        var obj = {};
        for(var i = 0, l = arguments.length; i < l; i++) {
            var ext = arguments[i];
            for(var key in ext) {
                if (ext.hasOwnProperty(key)) {
                    obj[key] = ext[key];
                }
            }
        }

        return obj;

    },

    inherit: function(base, sub, proto) {
        base.prototype = Object.create(sub.prototype);
        base.prototype.constructor = base;
        util.extend(base.prototype, proto);
    },

    async: function(items, func, done, scope) {

        var index = 0;
        function next(err) {

            var item = items[index++];
            if (item && !err) {
                func.call(scope || null, item, next);

            } else {
                done.call(scope || null, err);
            }

        }

        next();

    },

    parallel: function(items, func, done, scope) {

        var count = items.length;
        items.forEach(function(item, i) {
            func.call(scope || null, item, i, function(err) {

                if (err) {
                    done(err);

                } else {
                    count--;
                    if (count === 0) {
                        done();
                    }
                }

            });
        });

    },

    delay: function(func, delay, scope) {
        setTimeout(function() {
            func.call(scope || null);

        }, delay);
    },

    throttle: function(func, delay, scope) {
        var timeout = null;
        return function() {

            clearTimeout(timeout);

            timeout = setTimeout(function() {
                func.call(scope || null);

            }, delay || 100);

        };
    }

};

module.exports = util;

