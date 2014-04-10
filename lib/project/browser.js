/*global XMLHttpRequest, document, window */
(function(window) {

    // Substrat Reload Handler
    var uid = '%uid',
        reloadUrl = '%reloadUrl?r=' + Math.random(),
        initUrl = '%initUrl';

    // Save scroll position
    function save() {
        try {
            window.sessionStorage[uid + '.scroll.x'] = '' + document.body.scrollLeft;
            window.sessionStorage[uid + '.scroll.y'] = '' + document.body.scrollTop;

        } catch(e) {
        }
    }

    // Restore scroll position
    function restore() {

        var x = null,
            y = null;

        try {
            x = window.sessionStorage[uid + '.scroll.x'] || null;
            y = window.sessionStorage[uid + '.scroll.y'] || null;
            delete window.sessionStorage[uid + '.scroll.x'];
            delete window.sessionStorage[uid + '.scroll.y'];

        } catch(e) {
            return;
        }

        if (x !== null && y !== null) {

            // Since the layout might still reflow and the document size might
            // change, we need to periodically check the scroll offset
            var retries = 0,
                lx = document.body.scrollLeft,
                ly = document.body.scrollTop;

            var t = window.setInterval(function() {

                var sx = document.body.scrollLeft,
                    sy = document.body.scrollTop;

                if (sx !== lx || sy !== ly) {
                    retries = 0;
                    lx = sx;
                    ly = sy;
                }

                // No further changes, should be restored now
                if ((sx === +x && sy === +y) || retries > 30) {
                    window.clearInterval(t);

                } else {
                    retries++;
                    document.body.scrollLeft = +x;
                    document.body.scrollTop = +y;
                }

            }, 25);
        }

    }

    // Init Watcher
    function init() {

        var canceled = false,
            reloadTimeout = null,
            retryTimeout = null;

        var open = [];
        function reload(reconnect, url, initial) {

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function() {

                // Keep track of running XHRs
                if (xhr.readyState === 4) {
                    open.splice(open.indexOf(xhr), 1);
                }

                // Substrat triggered a reload
                if (xhr.readyState === 4 && xhr.status === 200) {

                    // Handle partial updates
                    if (xhr.responseText.length) {
                        var data = JSON.parse(xhr.responseText);
                        if (data.error) {
                            handleError(data.error);

                        } else if (data.changes) {
                            handleUpdate(data.changes, initial);

                        } else {
                            document.location.reload();
                        }

                    // Trigger a full reload after reconnecting
                    } else {
                        document.location.reload();
                    }

                    window.clearTimeout(reloadTimeout);
                    window.clearTimeout(retryTimeout);

                    // Avoid scenarios were we have multiple reload requests
                    // running in parallel
                    if (open.length === 0) {
                        reload(false, reloadUrl);
                    }

                // Substrat exited, try to reconnect
                } else if (xhr.readyState === 4 && !canceled) {

                    window.clearTimeout(reloadTimeout);
                    retryTimeout = window.setTimeout(function() {
                        xhr.abort();
                        window.clearTimeout(reloadTimeout);
                        window.clearTimeout(retryTimeout);
                        reload(true, initUrl);

                    }, 1000);

                } else {
                    canceled = false;
                }

            };

            open.push(xhr);
            xhr.send();

            // The request will eventually fail if delayed indefinitely by the
            // server; thus, we need manually reset it every second
            reloadTimeout = window.setTimeout(function() {
                canceled = true;
                xhr.abort();
                reload(false, reloadUrl);

            }, 1000);

        }

        restore();
        reload(false, reloadUrl, true);

    }

    function handleError(message) {
        window.alert('Build Error: ' + message);
    }

    var css = /\.css$/,
        origin = window.location.protocol + "//" + window.location.host;

    function linkName(l) {
        return l.href.substring(origin.length + 1).split('?')[0];
    }

    function getLinks() {
        return Array.prototype.slice.call(document.head.getElementsByTagName('link'));
    }


    function handleUpdate(changes, initial) {

        if (initial) {
            return false;
        }

        // Handle newly added files
        var reload = false;
        changes.added.forEach(function(file) {

            // CSS
            if (css.test(file)) {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = file;
                document.head.appendChild(link);

            } else {
                reload = true;
            }

        });

        // Handle changed files
        changes.changed.forEach(function(file) {

            // CSS
            if (css.test(file)) {

                getLinks().filter(function(l) {
                    return linkName(l) === file;

                }).map(function(link) {
                    link.href = file + '?id=' + Math.random() + '-' + Date.now();
                });

            } else {
                reload = true;
            }

        });

        // Handle removed files
        changes.removed.forEach(function(file) {

            // CSS
            if (css.test(file)) {

                getLinks().filter(function(l) {
                    return linkName(l) === file;

                }).map(function(link) {
                    document.head.removeChild(link);
                });

            } else {
                reload = true;
            }

        });

        if (reload) {
            document.location.reload();
        }

    }

    // Events
    if (window.addEventListener) {
        window.addEventListener('load', init, false);
        window.addEventListener('beforeunload', save, false);

    } else {
        window.attachEvent('onload', init);
        window.attachEvent('onbeforeunload', save, false);
    }

})(window);

