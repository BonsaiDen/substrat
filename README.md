# Substrat - Relax and build

**Substrat** is a simple, automatic build system for static HTML5 projects. 
It's easy and quick to set up, configurable, extendable and built with single 
page applications in mind.


## Example Usage

1. Get it via `npm install substrat`
2. Require and use it in your build script (e.g. [Grunt](http://gruntjs.com))
    
```javascript
    var substrat = require('substrat');

    // Setup the file patterns
    var patterns = {

        js: {
            // Match all source files of the application, and put app and config
            // at the end when generating a array of the filenames from this pattern
            app: substrat.pattern(/js\/.*\.js$/).last('js/config.js', 'js/app.js'),

            // Match all the javascript source files of the libraries, but ignore any pre-minified ones
            lib: substrat.pattern(/lib\/.*\.js$/).not(/\.min\.js$/)
        },

        compile: {
            jade: substrat.pattern(/\.jade$/),
            less: substrat.pattern(/\.less$/)
        },

        // Match all style sheets both generated and existing ones
        // but put the generated ones at the end when generating a array of the
        // filenames from this pattern
        style: substrat.pattern(/(\.css|\.less)$/).last(/\.less$/),

        // A matcher for everything else
        all: substrat.pattern('*')

    };

    // Environment configuration
    var env = {
        title: 'Substrat',
        version: 0.1,
        patterns: patterns
    };

    // Create a new substrat instance
    var s = substrat.init({

        // The source directory to watch
        src: 'src',

        // The destination directory for the build
        dest: 'public',

        // Whether or not to log build events
        silent: false,
        
        // If true, will produce lots of internal logging output
        debug: false,

        // Enable compression in tasks (e.g. strip whitespace, minify js etc.)
        compress: false,

        // Set up dependencies
        depends: [
            // Rebuild src/index.jade every time a js or less file changes
            // This way, the template can automatically update the included
            // scripts and styles
            ['index.jade', [patterns.js, patterns.style]]
        ],
        
        // Define the tasks
        // Tasks are run in order, each task will filter out the files it matched
        // so they are not subject to any further tasks in the chain
        tasks: [
        
            // Compile all app specific scripts with uglify-js
            substrat.task.compile(patterns.js.app, 'js'),

            // Compile all jade files to html and supply them with the locals from "env"
            substrat.task.compile(patterns.compile.jade, 'jade', env),

            // Compile all less stylesheets to css
            substrat.task.compile(patterns.compile.less, 'less'),

            // Copy all other files which did not match any previous tasks
            substrat.task.copy(patterns.all)
        
        ]
        
    });

    // Invoke the build
    s.run();
```

## Configuration Options

- `src`: *String*
    
    The source directory which contains the file to build.

- `dest`: *String*

    The destination directory were the files produced by the build are to be found.
    The contents of the directory are automatically synced with the source, meaning 
    that files and folders which no longer exist in the source directory will automatically be removed.

- `silent`: *Boolean*

    If `true` disables substrat logging.

- `debug`: *Boolean*

    If `true` enables internal logging of substrat's components.

- `compress`: *Boolean*

    A flag which indicates to tasks that the should compress / minify their output.

    See the [Tasks](#Tasks) section for more details.

- `depends`: *Array[Array[Pattern, Pattern|Array[Patterns]]...]*

    A array containing arrays of patterns which specify which files should be 
    rebuild once other files matching the specified patterns have changed.

    See the [Dependencies](#Dependencies) section for more details.

- `tasks`

    A listing of tasks which will be executed in order once the contents of the 
    `src` directory change. Each successive tasks will filter out the files it 
    matched from the list of files that have changed.

    See the [Tasks](#Tasks) section for more details.


## Methods

- `run()`

    Invokes the build once and then finishes.

    Will emit the `done` event once the build has finished.


- `watch()`

    Will continously monitor the source directory for changed and re-build 
    automatically.

    Triggers a `build` event after each completed build.


- `listen(indexUrl, port [, host])`

    Same as `watch()` but will also start a local web server on the specified 
    `host` and `port` and will patch the specified `indexUrl` HTML file to automatically 
    reload on every build.

    To disable automatic reloading, simply pass `null` as the value of `indexUrl`.


- `stop()`
    
    Stops substrat in case it is watching or listening.

    Triggers the `stop` event.


- `pattern(expr)`
    
    Creates a new substart pattern from the given expression.


- `files(pattern)`

    Returns a list of files for the **destination** directory which match the 
    specified pattern(s).


## Patterns

Substrat makes heavy use of patterns for both file matching and listing.

Patterns can be created from a variety of sources and are converted to regular 
expressions internally. You can also create pass objects of patterns which will 
be merged, as well as arrays which will concatenate their matches.

> Note: All paths and files within substrat are treated relative to either the 
`src` or `dest` directories. E.g. `/home/user/project/src/js/app.js` will be treated as `js/app.js`.


### From Strings

All strings that are passed as patterns will have their regex characters escaped 
and are then converted into a regular expression for absolute matching (i.e. `/^escapedString$/`).

The only exception to this rule is the special string `*` which will get converted to `/^.*$/`.


### From Regular Expressions

You can pass any valid regular expression as a pattern.


### From Objects

Patterns from objects are merged, they object's keys are sorted via the standard 
`sort()` function and are then used to merge the object's values into a new pattern.


### From Arrays

Arrays will create so called *Pattern Groups*. Pattern groups apply all included 
patterns in order and will preserve the ordering of the files returned by the
individual sub patterns.


### Ordering

By default, the list of files return by a pattern when it matches is sorted by 
length. This can be changed by calling `pattern.sort(comparator)` and supplying a custom 
sorting function which will be run every time the pattern matches.

There are also the very useful `pattern.first(patterns...)` and 
`pattern.last(patterns...)` functions which will move the files matching the 
specified patterns either to the beginning or the end of the file list. 

    substrat.pattern(/js\/.*\.js$/).first('js/config.js').last('js/init.js', 'js/afterInit.js');

For example, this allows you to get a list of all JavaScript files in your application 
and then put the file that defines your namespaces and configuration and the beginning
of the list and the file initializing your code at the very end.
    

## Tasks

Documentation coming soon.


## Dependencies

Substrat includes a minimal - but efficient - dependency management for files 
which is also based on pattern.

Dependencies are specified in the format of an array with two entries. The first 
one is a pattern which describes which files will be re-build and the second 
entry being a pattern which specifies which files will trigger the re-build.

```javascript
    ['index.jade', [/*.js$/, /*.less$/]]
```

The above will rebuild `index.jade` every time that a `.js` or `.less` file has 
been added, changed or removed from the source directory.

Of course it is also possibly to re-build multiple files, simply supply a more 
complex pattern as the first entry of the array:

```javascript
    [/template\/view\/controller\/*.jade$/, [/*.js$/, /*.less$/]]
```

> Note: Every rebuild will trigger another check for dependencies. 
> This allows for the creation of dependencies that depend on other dependencies.


## License

**Substrat** is licenses under MIT.

