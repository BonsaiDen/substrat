# Substrat - Watch and Compile

**Substrat** is a simple, automatic build system for static HTML5 projects. 
It's easy and quick to set up, configurable, extendable and built with single 
page apps in mind.


## How it works

It uses [chokidar](https://github.com/paulmillr/chokidar) under the hood to continously monitor the project 
files for changes it then invokes the specified tasks and keeps track of the source 
and output files.

It automatically cleans up the `build` directory when files get removed and is able 
to map one input file to multiple output files (i.e. js source + corresponding source map).

One can also specify a special `index` file which gets rebuild every time the project 
changes and is supplied with configuration data.

Finally, by including the Substrat bootstrap code in the generated HTML, it will 
automatically reload the page when needed.


## Getting Started

In order to automatically build a project with JavaScript, 
[Jade](http.//jade-lang.org/) and [LessCSS](http://lesscss.org/) we'll be 
utilizing the `compile` tasks to convert *jade* to *html*, *less* to *css* and 
minifiy our JavaScript when running in production mode.

In addition, we'll provide enviroment data to our `index.jade` file and automatically 
build the list of JavaScript and CSS files we need to include.


### Step #1

First we will create `app.js` which will configure and run Substrat:

```javascript
var substrat = require('substrat'),
    production = false;

var s = substrat({

    // The source directory which will be monitored
    src: 'src', 

    // The destination directory in which the source files will be compiled / copied
    dest: 'public',

    // Whether to compress jade, less, javascript etc.
    compress: production,

    // The index template which gets re-compiled on each file addition / removal
    index: 'index.jade',
    
    // A function which returns the locals for the index template
    environment: function(files, substrat) {
        return {
            scripts: files.js,
            styles: files.less,
            substrat: substrat
        };
    }

});


// Compile all JavaScript files under src/js, but ignore everything else (i.e. /lib/jquery.min.js)
// The regular expression is optional
s.task.compile(/js\/.*\.js$/, 'js');

// We'll be using jade templates
// Leaving out the regex will simply match all the files with the given extension
s.task.compile('jade');

// As well as LessCSS
s.task.compile('less');

// Copy everything else that sits in the source directory, and does not match any of the above tasks
s.task.copy('*');

```

### Step #2

Now we set up our `index.jade` file and let it include the JavaScript and CSS files:

```jade
doctype 5
html(lang="en")
  head
    title Substrat Demo
    - each script in scripts
      script(src='#{script}')

    - each style in styles
      link(href='#{style}', rel='stylesheet')

  body
    p Hello Substrat!

  !#{substrat} // Include the bootstrap code for auto reload
```


### Step #3

Create some `.js` and `.less` files and run `node app.js`, it will compile and 
generate the project and create the following `index.html`.


```html


```


## Tasks

At the moment, **Substrat** ships with the following built-in tasks:

- __compile__

    - `js`

        Minifies the source and creates source maps using 
        [UglifyJS](https://github.com/mishoo/UglifyJS2) if `compress = true`.

    - `less`

        Generates `css` files from [LessCSS](http://lesscss.org/), removes 
        whitespace from the output if `compress = true`.

    - `jade`

        Generates `html` files from [Jade](http.//jade-lang.org/), removes 
        whitespace from the output if `compress = true`.

    - `sass`

        SASS to CSS, coming soon.

    - `markdown`

        Markdown to HTML, coming soon.

    - `coffeescript`

        Coffee to JS, coming soon.

- __concat__

    - Coming soon, will feature concatenation and compilation.

- __copy__

    A generic task to copy files from the source to the destination directory.


## Extending

Coming soon.


## License

**Substrat** is licenses under MIT.
