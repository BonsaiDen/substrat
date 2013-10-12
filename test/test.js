var substrat = require('../index'),
    fs = require('fs.extra');


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

    },

    all: function(test) {

        test.deepEqual(substrat.pattern('*').matches(files), [
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
        ]);

        test.done();

    },

    multiMatch: function(test) {

        var p = substrat.pattern(/js\/[^\/]*\.js$/, /js\/.*\.js$/);
        test.deepEqual(p.matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        p = substrat.pattern('js/**/*.js', 'js/*.js');
        test.deepEqual(p.matches(files), [
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/app.js',
            'js/util.js',
            'js/config.js'
        ]);

        test.done();

    },

    combination: function(test) {

        var p = substrat.pattern(/js\/.*\.js$/).
                first('js/config.js').
                last('js/classes/**/*.js', 'js/util.js', 'js/app.js');

        test.deepEqual(p.matches(files), [
            'js/config.js',
            'js/classes/B.js',
            'js/classes/C.js',
            'js/classes/A.js',
            'js/util.js',
            'js/app.js'
        ]);

        test.done();

    }

};

function run(test, tasks, callback) {

    var sub = substrat.init({
        src: 'test/src',
        dest: 'test/public',
        quiet: true,
        tasks: tasks || []
    });

    fs.rmdir('./test/public', function(err) {

        sub.once('done', function() {

            var files = null,
                data = null;

            try {
                files = fs.readdirSync('test/public').sort();
                data = new Array(files.length);
                files.forEach(function(file, index) {
                    data[index] = fs.readFileSync('test/public/' + file).toString();
                });

            } catch(e) {
                files = [];
                data = [];
            }

            try {
                callback(files, data);
                test.done();

            } catch(err) {
                test.fail(err);
            }

        });

        sub.run();

    });

    return sub;

}

exports.substrat = {

    init: function(test) {

        var sub = run(test, null, function() {
            test.strictEqual(typeof sub.run, 'function');
            test.strictEqual(typeof sub.watch, 'function');
            test.strictEqual(typeof sub.listen, 'function');
            test.strictEqual(typeof sub.stop, 'function');
            test.strictEqual(typeof sub.pattern, 'function');
            test.strictEqual(typeof sub.files, 'function');
        });

    }

};

exports.tasks = {

    compile: function(test) {

        var tasks = [
            substrat.task.compile(/\.js$/, 'js'),
            substrat.task.compile(/\.jade$/, 'jade'),
            substrat.task.compile(/\.less$/, 'less')
        ];

        run(test, tasks, function(files, data) {

            test.deepEqual(files, ['test.css', 'test.html', 'test.js']);
            test.deepEqual(data, [
                '#test {\n  color: #ff0000;\n}\n.test {\n  color: #ff0000;\n}\n/*# sourceMappingURL=data:application/json,%7B%22version%22%3A3%2C%22sources%22%3A%5B%22test.less%22%5D%2C%22names%22%3A%5B%5D%2C%22mappings%22%3A%22AAEM%3BEACF%2CcAAA%3B%3BAAGE%3BEACF%2CcAAA%22%7D */',
                '\n<html>\n  <head></head>\n  <body></body>\n</html>',
                'function test(foo, bar) {\n    return foo + bar + 2;\n}\n'
            ]);

        });

    },

    concat: function(test) {

        var tasks = [
            substrat.task.concat(/\.js$/, 'js', 'all.js'),
            substrat.task.concat(/\.less$/, 'less', 'all.css')
        ];

        run(test, tasks, function(files, data) {

            test.deepEqual(files, ['all.css', 'all.js']);
            test.deepEqual(data, [
                '#test {\n  color: #ff0000;\n}\n.test {\n  color: #ff0000;\n}\n/*# sourceMappingURL=data:application/json,%7B%22version%22%3A3%2C%22sources%22%3A%5B%22input%22%5D%2C%22names%22%3A%5B%5D%2C%22mappings%22%3A%22AAEM%3BEACF%2CcAAA%3B%3BAAGE%3BEACF%2CcAAA%22%7D */',
                'function test(foo, bar) {\n    return foo + bar + 2;\n}\n'
            ]);

        });

    },

    copy: function(test) {

        var tasks = [
            substrat.task.copy('*')
        ];

        run(test, tasks, function(files, data) {

            test.deepEqual(files, [
                'test.jade',
                'test.js',
                'test.json',
                'test.less',
                'test.md'
            ]);

            test.deepEqual(data, [
                'html\n  head\n\n  body\n',
                'function test(foo, bar) {\n    return foo + bar + 2;\n}\n',
                '{\n    "string": \'"{{{String}}}"\',\n    "object": "{{{Object}}}"\n}\n',
                '@red: #ff0000;\n\n#test {\n    color: @red;\n}\n\n.test {\n    color: @red;\n}\n\n',
                '## Test\n\nTest.\n'
            ]);

        });

    },

    template: function(test) {

        var tasks = [
            substrat.task.template('test.json', {
                Object: JSON.stringify({
                    test: 'test'
                }),
                String: 'Test'

            }, ['"{{', '}}"'])
        ];

        run(test, tasks, function(files, data) {

            test.deepEqual(data, [
                '{\n    "string": \'Test\',\n    "object": {"test":"test"}\n}\n'
            ]);
            test.deepEqual(files, ['test.json']);

        });

    }

};

