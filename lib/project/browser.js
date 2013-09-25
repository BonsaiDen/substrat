/*global XMLHttpRequest, document, window */
(function(window) {

    // Substrat Reload Handler
    var uid = '%uid',
        reloadUrl = '%reloadUrl',
        initUrl = '%initUrl';

    function handler() {

        // Restore scroll position
        try {
            var x = window.sessionStorage[uid + '.scroll.x'] || null,
                y = window.sessionStorage[uid + '.scroll.y'] || null;

            if (x !== null && y !== null) {

                // Since the layout might still reflow and the document size might
                // change, we need to periodically check the scroll offset
                var retries = 0,
                    lx = document.body.scrollLeft,
                    ly = document.body.scrollTop;

                var restore = window.setInterval(function() {

                    var sx = document.body.scrollLeft,
                        sy = document.body.scrollTop;

                    if (sx !== lx || sy !== ly) {
                        retries = 0;
                        lx = sx;
                        ly = sy;
                    }

                    // No further changes, should be restored now
                    if ((sx === +x && sy === +y) || retries > 30) {
                        window.clearInterval(restore);

                    } else {
                        retries++;
                        document.body.scrollLeft = +x;
                        document.body.scrollTop = +y;
                    }

                }, 25);
            }

        } catch(e) {
        }

        var retry = false,
            reloadTimeout = null,
            retryTimeout = null;

        function reload(reconnect, url) {

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function() {

                // Substrat triggered a reload
                if (xhr.readyState === 4 && xhr.status === 200) {

                    // Save scroll position
                    try {
                        window.sessionStorage[uid + '.scroll.x'] = '' + document.body.scrollLeft;
                        window.sessionStorage[uid + '.scroll.y'] = '' + document.body.scrollTop;

                    } catch(e) {
                    }

                    document.location.reload();

                // Substrat exited, try to reconnect
                } else if (!retry) {
                    retryTimeout = window.setTimeout(function() {
                        xhr.abort();
                        window.clearTimeout(reloadTimeout);
                        window.clearTimeout(retryTimeout);
                        reload(true, initUrl);

                    }, 1000);
                }

                retry = false;

            };

            xhr.send();

            // The request will eventually fail if delayed indefinitely by the
            // server; thus, we need manually reset it every 30 seconds
            reloadTimeout = window.setTimeout(function() {
                retry = true;
                xhr.abort();
                reload(false, reloadUrl);

            }, 30000);

        }

        reload(false, reloadUrl);

    }

    if (window.addEventListener) {
        window.addEventListener('load', handler, false);

    } else {
        window.attachEvent('onload', handler);
    }

})(window);

