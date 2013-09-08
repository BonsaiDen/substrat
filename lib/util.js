// Utility Functions ----------------------------------------------------------
module.exports = {

    wait: function(func, delay) {
        var timeout = null;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(func, delay || 100);
        };
    },

    merge: function(a, b) {
        for(var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }
        return a;
    },

    list: function(list, id) {

        if (!list.hasOwnProperty(id)) {
            list[id] = [];
        }

        var items = list[id];
        return function() {

            var action = this.action,
                files = this.filename instanceof Array ? this.filename : [this.filename];

            files.forEach(function(filename) {
                var index = items.indexOf(filename);
                if (action === 'add' && index === -1) {
                    items.push(filename);
                    list.$changed = true;

                } else if (action === 'unlink' && index !== -1) {
                    items.splice(index, 1);
                    list.$changed = true;
                }
            });

            this.next();

        };

    }

};

