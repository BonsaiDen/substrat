/*global XMLHttpRequest, document, window */
(function(window) {

    // Substrat Reload Handler
    var uid = '%uid',
        reloadUrl = '%reloadUrl',
        initUrl = '%initUrl';

    function handler() {

        // Restore scroll position
        try {
            var x = window.sessionStorage[uid + '.scrollX'] || null,
                y = window.sessionStorage[uid + '.scrollY'] || null;

            if (x !== null && y !== null) {

                // Since the layout might still reflow and the document size might
                // change, we need to periodically check the scroll offset
                var restore = window.setInterval(function() {

                    var sx = document.body.scrollLeft,
                        sy = document.body.scrollTop;

                    // No further changes, should be restored now
                    if (sx === +x && sy === +y) {
                        window.clearInterval(restore);

                    } else {
                        document.body.scrollLeft = +x;
                        document.body.scrollTop = +y;
                    }

                }, 25);
            }

        } catch(e) {
        }

        var retry = false;
        function reload(reconnect, url) {

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function() {

                // Substrat triggered a reload
                if (xhr.readyState === 4 && xhr.status === 200) {

                    // Save scroll position
                    try {
                        window.sessionStorage[uid + '.scrollX'] = '' + document.body.scrollLeft;
                        window.sessionStorage[uid + '.scrollY'] = '' + document.body.scrollTop;

                    } catch(e) {
                    }

                    document.location.reload();

                // Substrat exited, try to reconnect
                } else if (!retry) {
                    window.setTimeout(function() {
                        xhr.abort();
                        reload(true, initUrl);

                    }, 2500);
                }

                retry = false;

            };

            xhr.send();

            // The request will eventually fail if delayed indefinitely by the
            // server; thus, we need manually reset it every 30 seconds
            window.setTimeout(function() {
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

