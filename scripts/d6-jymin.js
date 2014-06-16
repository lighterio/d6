/**
 * This file is used in conjunction with Jymin to form the D6 client.
 *
 * If you're already using Jymin, you can use this file with it.
 * Otherwise use ../d6-client.js which includes required Jymin functions.
 */

(function () {

  /**
   * The D6 function accepts new templates from /d6.js, etc.
   */
  var D6 = window.D6 = function (newViews) {
    decorateObject(views, newViews);
    if (!isReady) {
      init();
    }
  };

  var views = D6._VIEWS = {};

  var cache = D6._CACHE = {};

  var isReady = false;

  var body;

  /**
   * Initialization binds event handlers.
   */
  var init = function () {

    body = document.body;

    // When a same-domain link is clicked, fetch it via XMLHttpRequest.
    on(body, 'a', 'click', function (a, event) {
      var url = removeHash(a.href);
      var buttonNumber = event.which;
      var isLeftClick = (!buttonNumber || (buttonNumber == 1));
      if (isSameDomain(url) && isLeftClick) {
        preventDefault(event);
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

    // When a form field changes, timestamp the form.
    var inputChanged = function (input) {
      var form = input.form;
      if (form) {
        form._LAST_CHANGED = getTime();
      }
    };
    on(body, 'input', 'change', inputChanged);
    on(body, 'select', 'change', inputChanged);
    on(body, 'textarea', 'change', inputChanged);

    // When a form button is clicked, attach it to the form.
    var buttonClicked = function (button) {
      if (button.type == 'submit') {
        var form = button.form;
        if (form) {
          if (form._CLICKED_BUTTON != button) {
            form._CLICKED_BUTTON = button;
            form._LAST_CHANGED = getTime();
          }
        }
      }
    };
    on(body, 'input', 'click', buttonClicked);
    on(body, 'button', 'click', buttonClicked);

    // When a form is submitted, gather its data and submit via XMLHttpRequest.
    on(body, 'form', 'submit', function (form, event) {
      var url = removeHash(form.action);
      var isGet = (lower(form.method) == 'get');
      if (isSameDomain(url)) {
        preventDefault(event);

        // Get form data.
        var data = [];
        all(form, 'input,select,textarea,button', function (input) {
          var name = input.name;
          var type = input.type;
          var value = getValue(input);
          var ignore = !name;
          ignore = ignore || ((type == 'radio') && !value);
          ignore = ignore || ((type == 'submit') && (input != form._CLICKED_BUTTON));
          if (!ignore) {
            if (isString(value)) {
              push(data, escape(name) + '=' + escape(value));
            }
            else {
              forEach(value, function (val) {
                push(data, escape(name) + '=' + escape(val));
              });
            }
          }
        });

        // For a get request, append data to the URL.
        if (isGet) {
          url += (contains(url, '?') ? '&' : '?') + data.join('&');
          data = 0;
        }
        // If posting, append a timestamp so we can repost with this base URL.
        else {
          url = appendD6Param(url, form._LAST_CHANGED);
          data = data.join('&');
        }

        // Submit form data to the URL.
        loadUrl(url, data);
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

  var appendD6Param = function (url, number) {
    return url + (contains(url, '?') ? '&' : '?') + 'd6=' + (number || 1);
  };

  var removeD6Param = function (url) {
    return url.replace(/[&\?]d6=[1r]/g, '');
  };

  var prefetchUrl = function (url) {
    // Only proceed if it's not already prefetched.
    if (!cache[url]) {
      //+env:debug
      log('[D6] Prefetching "' + url + '".');
      //-env:debug

      // Create a callback queue to execute when data arrives.
      cache[url] = [function (response) {
        //+env:debug
        log('[D6] Executing callbacks for prefetched URL "' + url + '".');
        //-env:debug

        // Cache the response so data can be used without a queue.
        cache[url] = response;

        // Remove the data after 10 seconds, or the given TTL.
        var ttl = response.ttl || 1e4;
        setTimeout(function () {
          // Only delete if it's not a new callback queue.
          if (!isArray(cache[url])) {
            //+env:debug
            log('[D6] Removing "' + url + '" from prefetch cache.');
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
  var loadUrl = D6._LOAD_URL = function (url, data) {
    D6._LOADING_URL = removeD6Param(url);
    D6._LOAD_STARTED = getTime();

    //+env:debug
    log('[D6] Loading "' + url + '".');
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
      log('[D6] Creating callback queue for "' + url + '".');
      //-env:debug
      cache[url] = [renderResponse];
      getD6Json(url, data);
    }
    // If the "resource" is a callback queue, then pushing means listening.
    else if (isArray(resource)) {
      //+env:debug
      log('[D6] Queueing callback for "' + url + '".');
      //-env:debug
      push(resource, renderResponse);
    }
    // If the resource exists and isn't an array, render it.
    else {
      //+env:debug
      log('[D6] Found precached response for "' + url + '".');
      //-env:debug
      renderResponse(resource);
    }
  };

  /**
   * Request JSON, then execute any callbacks that have been waiting for it.
   */
  var getD6Json = function (url, data) {
    //+env:debug
    log('[D6] Fetching response for "' + url + '".');
    //-env:debug

    // Indicate with a URL param that D6 is requesting data, so we'll get JSON.
    var d6Url = appendD6Param(url);

    // When data is received, cache the response and execute callbacks.
    var onComplete = function (data) {
      var queue = cache[url];
      cache[url] = data;
      //+env:debug
      log('[D6] Running ' + queue.length + ' callback(s) for "' + url + '".');
      //-env:debug
      forEach(queue, function (callback) {
        callback(data);
      });
    };

    // Fire the JSON request.
    getResponse(d6Url, data, onComplete, onComplete, 1);
  };

  // Render a template with the given context, and display the resulting HTML.
  var renderResponse = function (context) {
    D6._CONTEXT = context;
    var err = context._ERROR;
    var requestUrl = removeD6Param(context._REQUEST._URL);
    var responseUrl = context.d6u || requestUrl;
    var viewName = context.d6 || 'error0';
    var view = D6._VIEW = views[viewName];
    var html;

    // Make sure the URL we render is the last one we tried to load.
    if (requestUrl == D6._LOADING_URL) {

      // Reset any spinners.
      all('._SPINNER', function (spinner) {
        removeClass(spinner, '_LOADING');
      });

      // If we got a string, try rendering it as HTML.
      if (isString(context) && trim(context)[0] == '<') {
        html = context;
        //+env:debug
        log('[D6] Rendering HTML string');
        //-env:debug
      }

      // If the context refers to a view that we have, render it.
      else if (view) {
        html = view.call(views, context);
        //+env:debug
        log('[D6] Rendering view "' + viewName + '".');
        //-env:debug
      }

      // If we can't find a corresponding view, navigate the old-fashioned way.
      else {
        //+env:debug
        error('[D6] View "' + viewName + '" not found. Changing location.');
        //-env:debug
        window.location = responseUrl;
      }
    }

    // If there's HTML to render, show it as a page.
    if (html) {
      writeHtml(html);

      // Change the location bar to reflect where we are now.
      pushHistory(responseUrl);

      // If we render this page again, we'll want fresh data.
      delete cache[requestUrl];
    }
  };

  /**
   * Overwrite the page with new HTML, and execute embedded scripts.
   */
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
    scripts.forEach(execute);
    onReady();
  };

  /**
   * Insert a script to load D6 templates, using the cachebust from "/a.js".
   */
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
