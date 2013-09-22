// List Abstraction -----------------------------------------------------------
function List() {
    this._items = [];
}


// Statics --------------------------------------------------------------------
List.sortByLength = function(a, b) {
    return a.length - b.length;
};


// Methods --------------------------------------------------------------------
List.prototype = {

    add: function(value) {
        if (!this.contains(value)) {
            this._items.push(value);
            return true;

        } else {
            return false;
        }
    },

    append: function(values) {
        for(var i = 0, l = values.length; i < l; i++) {
            this.add(values[i]);
        }
    },

    contains: function(value) {
        return this._items.indexOf(value) !== -1;
    },

    remove: function(value) {
        if (this.contains(value)) {
            this._items.splice(this._items.indexOf(value), 1);
            return true;

        } else {
            return false;
        }
    },

    sort: function(cmp) {
        this._items.sort(cmp);
    },

    values: function() {
        return this._items.slice();
    },

    clear: function() {
        this._items.length = 0;
    }

};

module.exports = List;

