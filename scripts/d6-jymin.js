/**
 * This file is used in conjunction with Jymin to form the D6 client.
 *
 * If you're already using Jymin, you can use this file with it.
 * Otherwise use ../d6-client.js which includes required Jymin functions.
 */

var d6Load = function (url) {
  if (window.d6) {
    d6._LOAD(url);
  }
};

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

  var cache = {};

  var isReady = false;

  var body;

  /**
   * Initialization binds event handlers.
   */
  var init = function () {

    body = document.body;

    // When a same-domain link is clicked, fetch it via AJAX.
    on(body, 'a', 'click', function (a, event) {
      var url = a.href;
      var which = event.which;
      if (isSameDomain(url) && (!which || which == 1)) {
        //+env:dev
        log('Loading URL: "' + url + '"');
        //-env:dev
        preventDefault(event);
        pushHistory(url);
        loadUrl(url, renderResponse);
      }
    });

    // When a same-domain link is hovered, prefetch it.
    // TODO: Use mouse movement to detect probably targets.
    on(body, 'a', 'mouseover', function (a, event) {
      if (!hasClass(a, '_NOPREFETCH')) {
        var url = a.href;
        if (isSameDomain(url)) {
          prefetchUrl(url);
        }
      }
    });

    var currentLocation = location;

    // When a user presses the back button, render the new URL.
    onHistoryPop(function (event) {
      loadUrl(location, renderResponse);
    });

    isReady = true;
  };

  var isSameDomain = function (url) {
    return startsWith(url, location.protocol + '//' + location.host + '/');
  };

  var prefetchUrl = function (url) {
    if (!cache[url]) {
      // Create a callback queue.
      var callbacks = cache[url] = [];
      getD6Json(url, function (response) {
        // If callbacks were registered, use it and remove it.
        if (getLength(callbacks)) {
          forEach(callbacks, function (callback) {
            callback(response);
          });
          delete cache[url];
        }
        // Otherwise, wait up to its TTL for it to be loaded.
        else {
          cache[url] = response;
          // By default, give the user 10 seconds to click.
          var ttl = response.ttl || 1e4;
          setTimeout(function () {
            delete cache[url];
          }, ttl);
        }
      });
    }
  };

  /**
   * Load a URL via GET request.
   */
  var loadUrl = d6._LOAD = function (url, callback) {

    // Set all spinners in the page to their loading state.
    all('._SPINNER', function (spinner) {
      addClass(spinner, '_LOADING');
    });

    // A resource is either a cached response, a callback queue, or nothing.
    var resource = cache[url];

    // If there's no resource, start the JSON request.
    if (!resource) {
      getD6Json(url, callback);
    }
    // If the "resource" is a callback queue, then pushing means listening.
    else if (isArray(resource)) {
      push(resource, callback);
    }
    // If the resource exists and isn't an array, render it.
    else {
      resource.request.url = url;
      renderResponse(resource);
    }
  };

  // Request JSON, indicating with a URL param that D6 is requesting it.
  var getD6Json = function (url, callback) {
    url += (contains(url, '?') ? '&' : '?') + 'd6=on';
    getJson(url, callback);
  };

  // Render a template with the given context, and display the resulting HTML.
  var renderResponse = function (context) {
    var err = context._ERROR;
    var view = views[context.view];
    var html;

    // Reset any spinners.
    all('._SPINNER', function (spinner) {
      removeClass(spinner, '_LOADING');
    });

    // If there's an error, render the error text.
    if (err) {
      html = context._TEXT;
      //+env:dev
        error(err + ': "' + html + '"');
      //-env:dev
      writeHtml(html);
    }

    // If the context refers to a view that we have, render it.
    else if (view) {
      html = view.call(views, context);
      writeHtml(html);
    }

    // If we can't find a corresponding view, navigate the old-fashioned way.
    else {
      //+env:dev
        error('View not found: "' + context.view + '"');
      //-env:dev
      window.location = context.request.url;
    }
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
  }

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
