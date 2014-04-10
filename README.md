# Substrat - Relax your build ![Build Status](https://api.travis-ci.org/BonsaiDen/substrat.png)

**Substrat** is a powerful yet simple build system for HTML5 projects. 

It's easy and quick to set up, configurable, extendable and built with for 
frontend heavy, single page applications.

![npm Details](https://nodei.co/npm/substrat.png)


## Features

- Automatic monitoring and syncing our source and build directories
- Supports complex [file patterns](#patterns) for file filtering and ordering
- Has task dependencies to re-build files when other files are changed (based on patterns)
- Built in static web server with support for automatic page reload on each build 
- Comes with many built-in tasks for things like:

    - JS Minification (using [UglifyJS](https://github.com/mishoo/UglifyJS2))
    - Stylesheet compilation (using [lesscss](https://github.com/less/less.js))
    - HTML Templating (using [Jade](https://github.com/visionmedia/jade))
    - Markdown to HTML (using [markdown-js](https://github.com/evilstreak/markdown-js))
    - Generating files from templates (using [mustache.js](https://github.com/janl/mustache.js))
    - Dynamic file generation (using your custom functions)

- Easily set up proxies:

    - Avoid CORS configuration and other issues during local development
    - Proxy a directory and easily inject mocks for your tests
    - Add delays to all requests in order to simulate bad networks

- Is easy to extend with your own, custom tasks
- Standalone, can be integrated with [Grunt](http://gruntjs.com), [Jake](https://github.com/mde/jake) or any other task runner or existing build script


## Usage

1. Get it via `npm install substrat`
    
    ```javascript
    var substrat = require('substrat');
    ```

2. Setup your patterns, these allow you to group and filter the files for your build

    ```javascript
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
    ```

3. Define an environment for the use in your templates, you can also expose the patterns so you can include all your scripts and styles automatically

    ```javascript
    var env = {
        title: 'Substrat',
        version: 0.1,
        patterns: patterns // Expose the patterns for later usage
    };
    ```

4. Create a new instance of substrat with your specific configuration

    ```javascript
    var s = substrat.init({

        // The source directory to watch
        src: 'src',

        // The destination directory for the build
        dest: 'public',

        // Whether or not to log build events, will still print general info
        silent: false,
        
        // Will disable all logging (sets silent to true)
        quiet: false,

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
        
        ],

        // Setup some proxies for testing and local database access
        proxy: {

            // Proxy the local couchdb instance to avoid messy CORS setup during 
            // development
            '/couchdb': {

                // URL is the target of the proxy
                host: 'localhost',
                port: 5984,

                // Add 500 milliseconds of delay to each request
                delay: 500

            },

            // Proxy the "public" directory itself but "mock" out a couple of
            // files to inject test mocks / frameworks
            '/test': {

                // The directory to serve 
                root: 'public',

                // Replace the main application file and include additional files 
                // for testing
                mock: {
                    'js/app.js': [
                        'test/e2e/app.js',
                        'test/e2e/mocks.js'
                    ]
                }

            }

        }
        
    });
    ```

5. Start your continous build that automatically reloads your browser while you're editing

    ```javascript
    s.listen('index.html', 4444);
    ```

Read on for more details on the configuration options and tasks.


## Configuration Options

- `src`: *String*
    
    The source directory which contains the file to build.

- `dest`: *String*

    The destination directory were the files produced by the build are to be found.

    The contents of the directory are automatically synced with the source, 
    meaning that files and folders which no longer exist in the source directory 
    will automatically be removed.

- `silent`: *Boolean (false)*

    If `true` disables substrat logging (except for top level logs).

- `quiet`: *Boolean (false)*

    If `true` disables **all** substrat logging (enables `silent`).

- `debug`: *Boolean (false)*

    If `true` enables internal logging of substrat's components.

- `hidden`: *Boolean (true)*

    When `true` substrat will ingore any dotfiles.

- `excludePattern`: *RegExp (/\..*~$/)*

    A additional regular expression which will be used to filter all files in 
    the source directory. Defaults to filter common backup files which end with 
    a `~` (tilde).

- `compress`: *Boolean(false)*

    A flag which indicates to tasks that the should compress / minify their 
    output.

    See the [Tasks](#tasks) section for more details.

- `sourceMaps`: *Boolean(true)*

    Whether or not to generate source maps for CSS and JavaScript files when 
    performing compression or concatenating tasks.

- `depends`: *Array[Array[Pattern, Pattern|Array[Patterns]]...]*

    A array containing arrays of patterns which specify which files should be 
    rebuild once other files matching the specified patterns have changed.

    See the [Dependencies](#dependencies) section for more details.

- `tasks`: *Array*

    A listing of tasks which will be executed in order once the contents of the 
    `src` directory change. Each successive tasks will filter out the files it 
    matched from the list of files that have changed.

    See the [Tasks](#tasks) section for more details.

- `proxy`: *Object*

    A mapping of paths to proxy configurations.

    See the [Proxies](#proxies) section for more details.

- `cssReload`: *Boolean(false)*

    Enables in-page reloading of CSS resources without reloading the full page.


## Methods

- `run()` -> *this*

    Invokes the build once and then finishes.

    Will emit the `done` event once the build has finished.


- `watch()` -> *this*

    Will continously monitor the source directory for changed and re-build 
    automatically.

    Triggers a `build` event after each completed build.


- `listen(indexUrl, port [, host])` -> *this*

    Same as `watch()` but will also start a local web server on the specified 
    `host` and `port` and will patch the specified `indexUrl` HTML file to 
    automatically reload on every build.

    To disable automatic reloading, simply pass `null` as the value of `indexUrl`.


- `stop()` -> *this*
    
    Stops substrat in case it is watching or listening.

    Triggers the `done` event.


- `pattern(expr)` -> *Pattern*
    
    Creates a new substrat pattern from the given expression.


- `files(pattern)` -> *Array[String]*

    Returns a list of files for the **destination** directory which match the 
    specified pattern(s).


## Patterns

Substrat makes heavy use of patterns for both file matching and listing.

Patterns can be created from a variety of sources and are converted to regular 
expressions internally. You can also create pass objects of patterns which will 
be merged, as well as arrays which will concatenate their matches.

> Note: All paths and files within substrat are treated relative to either the 
`src` or `dest` directories. E.g. `/home/user/project/src/js/app.js` will be 
treated as `js/app.js`.


### From Strings

All strings are parsed via [minimatch](https://github.com/isaacs/minimatch) and 
converted into regular expressions. This means that you can use standard *glob* 
patterns like `**/*.js` and the like.

The only exception to this rule is the special string `*` which will get 
converted to `/^.*$/`.


### From Regular Expressions

You can pass any valid regular expression as a pattern.


### From Objects

Patterns from objects are merged, they object's keys are sorted via the standard 
`sort()` function and are then used to merge the object's values into a new 
pattern.


### From Functions

Functions which are passed as pattern will get invoked with the filename they
should test for matching. They should return either `true` or `false`.


### From Arrays

Arrays will create so called *Pattern Groups*. Pattern groups apply all included 
patterns in order and will preserve the ordering of the files returned by the
individual sub patterns.


### Ordering

Patterns have the very useful `pattern.first(patterns...)` and 
`pattern.last(patterns...)` methods which will move the files matching the 
specified patterns either to the beginning or the end of the file list. 

```javascript
substrat.pattern(/js\/.*\.js$/).first('js/config.js').last('js/init.js', 'js/afterInit.js');
```

For example, this allows you to get a list of all JavaScript files in your 
application and then put the file that defines your namespaces and configuration 
and the beginning
of the list and the file initializing your code at the very end.
    
### Exclusion

In addition patterns can include one or more files via the 
`pattern.not(pattern...)` method.


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


## Tasks

Tasks in substrat are highly configurable and easy to extend.


### Built-in Tasks

- __Compile__

    `substrat.task.compile(pattern, compiler[, config])`

    Compiles all the files matching the `pattern` from the `src` to the `dest` 
    using the specified `compiler`. Following compilers are available out of the box:

    > Note: The compile tasks by will **only** obfuscate and/or minify their 
    > output when the `substrat.compress` option is set.

    - `js`
        
        Compiles JavaScript files using `uglify-js`, if the `substrat.compress` 
        option is **enabled**,  otherwise it will simply copy the JS files.

        __Example: Minifying all applications JS files__

            substrat.task.compile('js/**/*.js', 'js')

    - `less`
        
        Compiles `less` files into CSS, changing the file extension in the process.
        If `substrat.compress` is set it will stip whitespace from the output files.

        __Example: Transforming less files into CSS__

            substrat.task.compile(/*\.less$/, 'less')

    - `jade`
        
        Compiles `jade` files into HTML, changing the file extension in the process.
        The `config` paramter should be an object and will be populate the **locals** 
        of the template.

        __Example: Converting all jade templates into HTML__

            substrat.task.compile(/*\.jade$/, 'jade', config)


- __Concat__

    `substrat.task.compile(pattern, type, outputFile)`

    This task is pretty much the same as `compile` task but only supports `js` 
    and `less` at the moment and will merge all the files into the specified 
    `outputFile`.


- __Copy__

    `substrat.task.compile(pattern)`

    Copies all the files matching the `pattern` from the `src` to the `dest` 
    directory. This task uses `fs.stream` interally for efficient copying and 
    will create directories in the destination as requried.

    __Example: Copying all outstanding files as the last task__

        substrat.task.copy('*')


- __Template__

    `substrat.task.template(pattern, locals [, tags, virtual])`

    Compiles all files matching the `pattern` as `mustache.js` templates and 
    supplies them with `locals`. The files get rendered to a file with the same 
    name in the `dest` directory.

    The optional`tags` array can be used to replace the default tags used in 
    mustache templates with custom ones. e.g. `['<%', '%>']`.

    If `virtual` is set to `true` the tasks will not generate an actual file on 
    disk, but rather a virtual which essentially replaces the `src` for the 
    duration of the build. This allows templated files to be picked up by 
    concators and other tasks.

    __Example: Rendering configuration file with custom tags to keep it JSHint friendly__

        substrat.task.template('js/config.js', config, ['"{{', '}}"']),


### Custom Tasks

New tasks can be created via the `substrat.Task` constructor:

    new substrat.Task(taskName, filePattern, handler, config)

- `taskName`: *String*
    
    This simply is a internal name for the task which is used in debug logging.

- `filePattern`: *Pattern*

    A substrat pattern which describes all files for which the task should be 
    executed.

    > Note: A `null` pattern will run the task on every build, not matter which 
    > files have changed.

- `handlerDescription`: *Object*

    A object which implements the actual logic of the task.

- `config`: *Object*

    Additional configuration which is available to the task logic during 
    execution.


### Task Handler Description

A task handler description consists of a number of properties and methods:
    
    var handlerDescription = {

        // Run the task independently for each file
        mode: substrat.Task.Each,

        // Automatically provide the file data to the task
        data: true,

        // Map the source files to html files in the output
        map: function(e, file) {
            return file.replace(/\.jade$/, '.html');
        },

        // The actual task logic
        run: function(e, done) {

            try {

                // Use the custom configuration of the task as the locals
                var locals = util.merge(e.config, {
                    pretty: !e.options.compress,
                    substrat: e.substrat
                });

                done(null, jade.render(e.data.toString(), locals));

            } catch(err) {
                done(err);
            }

        }

    };


- `mode`: *Integer*

    One of the following:

    - `Each`

        Run the task independently for each file, meaning that for five input 
        files the task will be run five times.

    - `All`

        Run the task once on all files, meaning that for five input files
        the task will be called exactly one time and will be provided with all 
        the files and their data at once.

    - `Single`

        Run the task once and don't care about the input. Useful for auto 
        generation of files and other things.


- `data`: *Boolean|Function(e)*

    Whether or not to automatically read the input file(s) and supply their 
    buffers to the task. Can also be a function which gets passed the [task 
    execution environment](#task-execution-environment) and should return a 
    `boolean`.


- `map`: *Function(e, file)*

    A function which maps the input filename to the respective outputs, can 
    also return an array with multiple output names (e.g. a JS file and its 
    corresponding source map file).

    It's arguments consists of the 
    [task execution environment](#task-execution-environment) and the path of 
    the file in source directory.

    These mappings are used to create the output files of the task in the 
    destination directory.
    
    In addition, they also server to synchronize the destination directory and 
    automatically remove files which are no longer exist in the source.

    They are also available via `substrat.files(patterns)` and can be used to
    automatically include files in HTML and other templates.


- `run`: *Function(e, done(err[, data]))*

    A function which performs the actual task logic.

    It's arguments consists of the 
    [task execution environment](#task-execution-environment) and a callback 
    function.

    The `done` callback takes the following arguments:

    - `err`: *Null|Error*

        The error value in case the task could failed. Pass `null` if the task
        was successful.A

    - `data`: *String|Array[String]* (Optional)

        The file data to be written into the files indicated by the return 
        value(s) of the handlers `map()` function.

        If left out, no file be written. This can be used by tasks which handle
        the writing on their own (e.g. the `copy` task which uses streams).


### Task Execution Environment

This "environment" argument is passed to all functions of a task handler 
description and has the following structure:

- `options`: *Object*

    A reference to the configuration object passed into `substrat.init()`.

- `config`: *Object*
    
    A reference to the configuration object passed into the task constructor.

- `mapped`: *String|Array[String]*

    The filename(s) returned by the `map()` function of the task handler.

    *Only for tasks running with mode `Task.Each` or `Task.All`*

- `source`: *String*
    
    The filename from the source directory.

    *Only for tasks running with mode `Task.Each`*

- `data`: *Buffer*

    A `Buffer` object with the contents of the file reference by `source`.

    *Only for tasks running with mode `Task.Each`*

- `path`: *String*

    The full path to the file in the source directory.

    *Only for tasks running with mode `Task.Each`*

- `all`: *Array[Object]*
    
    A array of objects with `source`, `data` and `path` properties as described 
    above.

    *Only for tasks running with mode `Task.All`*


## Proxies

Substrat can be used to quickly configure proxies to both http endpoints as well 
as local directories, this is done via the `substrat.proxy` option which takes a 
mapping of absolute paths to **proxy configuration objects** having the following 
structure:

- `host`: *String*

- `port`: *Integer*

- `delay`: *Integer*

- `root`: *String*

- `mock`: *Object*
    

## Outstanding Features / Fixes

- Add a grunt task
- Create a repository with a demo/example project
- Add Support for a `Subfile.js`
- Correctly write out source maps for JS and CSS files


## License

**Substrat** is licenses under MIT.

