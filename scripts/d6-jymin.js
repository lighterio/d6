/**
 * This file is used in conjunction with Jymin to form the D6 client.
 *
 * If you're already using Jymin, you can use this file with it.
 * Otherwise use ../d6-client.js which includes required Jymin functions.
 */

(function () {

  // If the browser doesn't work with D6, dont start D6
   if (!history.pushState) {
   window.D6 = {};
   return;
   }

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

  var render = D6._RENDER = function (viewName, context) {
    return views[viewName].call(views, context || D6._CONTEXT);
  };

  var isReady = false;

  /**
   * Initialization binds event handlers.
   */
  var init = function () {

    // When a same-domain link is clicked, fetch it via XMLHttpRequest.
    on('a', 'click', function (a, event) {
      var url = removeHash(a.href);
      if (url) {
        var buttonNumber = event.which;
        var isLeftClick = (!buttonNumber || (buttonNumber == 1));
        if (isSameDomain(url) && isLeftClick) {
          preventDefault(event);
          loadUrl(url, 0, a);
        }
      }
    });

    // When a same-domain link is hovered, prefetch it.
    // TODO: Use mouse movement to detect probably targets.
    on('a', 'mouseover', function (a, event) {
      if (!hasClass(a, '_NOPREFETCH')) {
        var url = removeHash(a.href);
        var isDifferentPage = (url != removeHash(location));
        if (isDifferentPage && isSameDomain(url)) {
          prefetchUrl(url);
        }
      }
    });

    // When a form field changes, timestamp the form.
    on('input,select,textarea', 'change', function (input) {
      var form = input.form;
      if (form) {
        form._LAST_CHANGED = getTime();
      }
    });

    // When a form button is clicked, attach it to the form.
    on('input,button', 'click', function (button) {
      if (button.type == 'submit') {
        var form = button.form;
        if (form) {
          if (form._CLICKED_BUTTON != button) {
            form._CLICKED_BUTTON = button;
            form._LAST_CHANGED = getTime();
          }
        }
      }
    });

    // When a form is submitted, gather its data and submit via XMLHttpRequest.
    on('form', 'submit', function (form, event) {
      var url = removeHash(form.action || location.href.replace(/\?.*$/, ''));
      var enc = getAttribute(form, 'enctype');
      var isGet = (lower(form.method) == 'get');
      if (isSameDomain(url) && !/multipart/.test(enc)) {
        preventDefault(event);

        var isValid = form._VALIDATE ? form._VALIDATE() : true;
        if (!isValid) {
          return;
        }

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
        loadUrl(url, data, form);
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

  var removeQuery = function (url) {
    return ensureString(url).replace(/\?.*$/, '');
  };

  var appendD6Param = function (url, number) {
    return url + (contains(url, '?') ? '&' : '?') + 'd6=' + (number || 1);
  };

  var removeD6Param = function (url) {
    return ensureString(url).replace(/[&\?]d6=[r\d]+/g, '');
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
        log('[D6] Caching contents for prefetched URL "' + url + '".');
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
  var loadUrl = D6._LOAD_URL = function (url, data, sourceElement) {
    D6._LOADING_URL = removeD6Param(url);
    D6._LOAD_STARTED = getTime();

    var targetSelector = getData(sourceElement, '_D6_TARGET');
    var targetView = getData(sourceElement, '_D6_VIEW');
    if (targetSelector) {
      all(targetSelector, function (element) {
        addClass(element, '_D6_TARGET');
      });
    }

    //+env:debug
    log('[D6] Loading "' + url + '".');
    //-env:debug

    // Set all spinners in the page to their loading state.
    all('._SPINNER', function (spinner) {
      addClass(spinner, '_LOADING');
    });

    var handler = function (context, url) {
      renderResponse(context, url, targetSelector, targetView);
    };

    // A resource is either a cached response, a callback queue, or nothing.
    var resource = cache[url];

    // If there's no resource, start the JSON request.
    if (!resource) {
      //+env:debug
      log('[D6] Creating callback queue for "' + url + '".');
      //-env:debug
      cache[url] = [handler];
      getD6Json(url, data);
    }
    // If the "resource" is a callback queue, then pushing means listening.
    else if (isArray(resource)) {
      //+env:debug
      log('[D6] Queueing callback for "' + url + '".');
      //-env:debug
      push(resource, handler);
    }
    // If the resource exists and isn't an array, render it.
    else {
      //+env:debug
      log('[D6] Found precached response for "' + url + '".');
      //-env:debug
      handler(resource, url);
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
        callback(data, url);
      });
    };

    // Fire the JSON request.
    getResponse(d6Url, data, onComplete, onComplete, 1);
  };

  // Render a template with the given context, and display the resulting HTML.
  var renderResponse = function (context, requestUrl, targetSelector, targetView) {
    D6._CONTEXT = context;
    var err = context._ERROR;
    var responseUrl = removeD6Param(context.d6u || requestUrl);
    var viewName = targetView || context.d6 || 'error0';
    var view = D6._VIEW = views[viewName];
    var html;
    requestUrl = removeD6Param(requestUrl);

    // Make sure the URL we render is the last one we tried to load.
    if (requestUrl == D6._LOADING_URL) {

      // Reset any spinners.
      all('._SPINNER,._D6_TARGET', function (spinner) {
        removeClass(spinner, '_LOADING');
      });

      // If we received HTML, try rendering it.
      if (trim(context)[0] == '<') {
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
      writeHtml(html, targetSelector);

      // Change the location bar to reflect where we are now.
      var isSamePage = removeQuery(responseUrl) == removeQuery(location.href);
      var historyMethod = isSamePage ? historyReplace : historyPush;
      historyMethod(responseUrl);

      // If we render this page again, we'll want fresh data.
      delete cache[requestUrl];
    }
  };

  /**
   * Overwrite the page with new HTML, and execute embedded scripts.
   */
  var writeHtml = function (html, targetSelector) {
    var body = document.body;
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
    // If we're just replacing the HTML of a target element, do so.
    if (targetSelector) {
      all(targetSelector, function (element) {
        setHtml(element, html);
      });
      forEach(scripts, execute);
      all(targetSelector, function (element) {
        onReady(element);
      });
    }
    // Otherwise, grab the body content, and mimic a page transition.
    else {
      match(html, /<body.*?>([\s\S]+)<\/body>/, function (tag, html) {
        setHtml(body, html);
        body.scrollTop = 0;
      });
      forEach(scripts, execute);
    }
  };

  /**
   * Insert a script to load D6 templates.
   */
  var cacheBust = '';
  one('link,script', function (element) {
    var delimiter = '?v=';
    var pair = ensureString(element.src || element.href).split(delimiter);
    if (pair[1]) {
      cacheBust = delimiter + pair[1];
    }
  });

  insertScript('/d6.js' + cacheBust);

})();
