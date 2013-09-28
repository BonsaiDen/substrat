var substrat = require('../index');


// Test Patterns --------------------------------------------------------------
// ----------------------------------------------------------------------------
var files = [
    'style/main.less',
    'index.jade',
    'js/classes/B.js',
    'partials/form.jade',
    'lib/bootstrap/bootstrap.css',
    'js/classes/C.js',
    'lib/bootstrap/bootstrap.js',
    'js/classes/A.js',
    'lib/bootstrap/bootstrap.min.js',
    'js/app.js',
    'js/util.js',
    'style/fix.less',
    'js/config.js',
    'style/view.less'
];

exports.patterns = {

    fromString: function(test) {

        test.deepEqual(substrat.pattern('*.jade').matches(files), [
            'index.jade'
        ]);

        test.deepEqual(substrat.pattern('js/*.js').matches(files), [
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.deepEqual(substrat.pattern('lib/**/*.js').matches(files), [
            'lib/bootstrap/bootstrap.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.deepEqual(substrat.pattern('style/*.less').matches(files), [
            'style/main.less',
            'style/fix.less',
            'style/view.less'
        ]);

        test.deepEqual(substrat.pattern('js/classes/*').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js'
        ]);

        test.deepEqual(substrat.pattern('**/*.js').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    fromRegularExpression: function(test) {

        test.deepEqual(substrat.pattern(/.*\.jade/).matches(files), [
            'index.jade',
            'partials/form.jade'
        ]);

        test.deepEqual(substrat.pattern(/js\/.*\.js/).matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.deepEqual(substrat.pattern(/lib\/.*\/.*\.js/).matches(files), [
            'lib/bootstrap/bootstrap.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.deepEqual(substrat.pattern(/.*\.js/).matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    fromFunction: function(test) {

        function m(file) {
            return file.indexOf('classes') !== -1;
        }

        test.deepEqual(substrat.pattern(m).matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js'
        ]);

        test.done();

    },

    fromObject: function(test) {

        var obj = {
            string: 'js/*.js',
            regex: /.*\.less$/
        };

        test.deepEqual(substrat.pattern(obj).matches(files), [
            'style/main.less',
            'js/app.js',
            'js/util.js',
            'style/fix.less',
            'js/config.js',
            'style/view.less'
        ]);

        test.done();

    },

    fromArray: function(test) {

        var list = [
            /lib\/.*\.js/,
            'js/classes/*.js',
            /\.js$/
        ];

        test.deepEqual(substrat.pattern(list).matches(files), [
            'lib/bootstrap/bootstrap.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    last: function(test) {

        test.deepEqual(substrat.pattern(/\.js$/).last('js/util.js', 'js/config.js', 'js/app.js').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js',
            'js/util.js',
            'js/config.js',
            'js/app.js'
        ]);

        test.done();

    },

    first: function(test) {

        test.deepEqual(substrat.pattern(/\.js$/).first('js/util.js', 'js/config.js', 'js/app.js').matches(files), [
            'js/util.js',
            'js/config.js',
            'js/app.js',
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.done();

    },

    not: function(test) {

        test.deepEqual(substrat.pattern(/\.js$/).not('js/util.js', 'js/config.js', 'js/app.js').matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'lib/bootstrap/bootstrap.js',
            'js/classes/A.js',
            'lib/bootstrap/bootstrap.min.js'
        ]);

        test.done();

    }

};

