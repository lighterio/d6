/**
 * This file is used in conjunction with Jymin to form the D6 client.
 *
 * If you're already using Jymin, you can use this file with it.
 * Otherwise use ../d6-client.js which includes required Jymin functions.
 */

(function () {

  /**
   * The d6 function accepts new templates from /d6.js, etc.
   */
  var d6 = window.d6 = function (newViews) {
    decorateObject(views, newViews);
    if (!isReady) {
      init();
    }
  };

  var views = d6._VIEWS = {};

  var cache = d6._CACHE = {};

  var isReady = false;

  var body;

  /**
   * Initialization binds event handlers.
   */
  var init = function () {

    body = document.body;

    // When a same-domain link is clicked, fetch it via AJAX.
    on(body, 'a', 'click', function (a, event) {
      var url = removeHash(a.href);
      var buttonNumber = event.which;
      var isLeftClick = (!buttonNumber || (buttonNumber == 1));
      if (isSameDomain(url) && isLeftClick) {
        preventDefault(event);
        pushHistory(url);
        loadUrl(url);
      }
    });

    // When a same-domain link is hovered, prefetch it.
    // TODO: Use mouse movement to detect probably targets.
    on(body, 'a', 'mouseover', function (a, event) {
      if (!hasClass(a, '_NOPREFETCH')) {
        var url = removeHash(a.href);
        var isDifferentPage = (url != removeHash(location));
        if (isDifferentPage && isSameDomain(url)) {
          prefetchUrl(url);
        }
      }
    });

    var currentLocation = location;

    // When a user presses the back button, render the new URL.
    onHistoryPop(function (event) {
      loadUrl(location);
    });

    isReady = true;
  };

  var isSameDomain = function (url) {
    return startsWith(url, location.protocol + '//' + location.host + '/');
  };

  var removeHash = function (url) {
    return ensureString(url).replace(/#.*$/, '');
  };

  var prefetchUrl = function (url) {
    // Only proceed if it's not already prefetched.
    if (!cache[url]) {
      //+env:debug
      log('D6: Prefetching "' + url + '".');
      //-env:debug

      // Create a callback queue to execute when data arrives.
      cache[url] = [function (response) {
        //+env:debug
        log('D6: Executing callbacks for prefetched URL "' + url + '".');
        //-env:debug

        // Cache the response so data can be used without a queue.
        cache[url] = response;

        // Remove the data after 10 seconds, or the given TTL.
        var ttl = response.ttl || 1e4;
        setTimeout(function () {
          // Only delete if it's not a new callback queue.
          if (!isArray(cache[url])) {
            //+env:debug
            log('D6: Removing "' + url + '" from prefetch cache.');
            //-env:debug
            delete cache[url];
          }
        }, ttl);
      }];
      getD6Json(url);
    }
  };

  /**
   * Load a URL via GET request.
   */
  var loadUrl = d6._LOAD_URL = function (url) {
    d6._LOADING_URL = url;
    d6._LOADING_START = new Date();

    //+env:debug
    log('D6: Loading "' + url + '".');
    //-env:debug

    // Set all spinners in the page to their loading state.
    all('._SPINNER', function (spinner) {
      addClass(spinner, '_LOADING');
    });

    // A resource is either a cached response, a callback queue, or nothing.
    var resource = cache[url];

    // If there's no resource, start the JSON request.
    if (!resource) {
      //+env:debug
      log('D6: Creating callback queue for "' + url + '".');
      //-env:debug
      cache[url] = [renderResponse];
      getD6Json(url);
    }
    // If the "resource" is a callback queue, then pushing means listening.
    else if (isArray(resource)) {
      //+env:debug
      log('D6: Queueing callback for "' + url + '".');
      //-env:debug
      push(resource, renderResponse);
    }
    // If the resource exists and isn't an array, render it.
    else {
      //+env:debug
      log('D6: Found precached response for "' + url + '".');
      //-env:debug
      renderResponse(resource);
    }
  };

  /**
   * Request JSON, then execute any callbacks that have been waiting for it.
   */
  var getD6Json = function (url, data) {
    //+env:debug
    log('D6: Fetching response for "' + url + '".');
    //-env:debug

    // Indicate with a URL param that D6 is requesting data, so we'll get JSON.
    var d6Url = url + (contains(url, '?') ? '&' : '?') + 'd6=on';

    // When data is received, cache the response and execute callbacks.
    var onComplete = function (response) {
      var queue = cache[url];
      cache[url] = response;
      forEach(queue, function (callback) {
        callback(response);
      });
    };

    // Fire the JSON request.
    getResponse(d6Url, data, onComplete, onComplete, 1);
  };

  // Render a template with the given context, and display the resulting HTML.
  var renderResponse = function (context) {
    d6._CONTEXT = context;
    var err = context._ERROR;
    var viewName = context._STATUS ? context.view : 'error0';
    var view = d6._VIEW = views[viewName];
    var url = context.request.url.replace(/[&\?]d6=on/, '');
    var html;

    // Make sure the URL we render is the last one we tried to load
    if (d6._LOADING_URL == url) {

      // Reset any spinners.
      all('._SPINNER', function (spinner) {
        removeClass(spinner, '_LOADING');
      });

      // If we got bad JSON, try rendering it as HTML.
      if (err == '_BAD_JSON') {
        html = context._TEXT;
        //+env:debug
        error('D6: Bad JSON. (' + err + '): "' + html + '"');
        //-env:debug
        writeHtml(html);
      }

      // If the context refers to a view that we have, render it.
      else if (view) {
        //+env:debug
        log('D6: Rendering view "' + viewName + '".');
        //-env:debug
        html = view.call(views, context);
        writeHtml(html);
      }

      // If we can't find a corresponding view, navigate the old-fashioned way.
      else {
        //+env:debug
        error('D6: View "' + viewName + '" not found. Changing location.');
        //-env:debug

        // TODO: Restore any existing hash from the request URL.
        window.location = url;
      }
    }

    // If we render this page again, we'll want a fresh context.
    delete cache[url];
  };

  var writeHtml = function (html) {
    match(html, /<title.*?>([\s\S]+)<\/title>/, function (tag, title) {
      document.title = title;
    });
    var scripts = [];
    html = html.replace(/<script.*?>([\s\S]*?)<\/script>/g, function (tag, js) {
      if (js) {
        scripts.push(js);
        tag = '';
      }
      return tag;
    });
    match(html, /<body.*?>([\s\S]+)<\/body>/, function (tag, html) {
      setHtml(body, html);
      body.scrollTop = 0;
    });
    var e = window.eval;
    scripts.forEach(function (js) {
      e(js);
    });
    onReady();
  };

  var cacheBust;
  var scripts = getElementsByTagName('script');
  forEach(scripts, function (script) {
    var pair = ensureString(script.src).split('?');
    if (hasMany(pair)) {
      cacheBust = pair[1];
    }
  });
  insertScript('/d6.js?' + cacheBust);

})();
