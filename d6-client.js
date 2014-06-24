/**
 *  ____   __      ____ _ _            _            ___   _   ___
 * |  _ \ / /_    / ___| (_) ___ _ __ | |_  __   __/ _ \ / | / _ \
 * | | | | '_ \  | |   | | |/ _ \ '_ \| __| \ \ / / | | || || | | |
 * | |_| | (_) | | |___| | |  __/ | | | |_   \ V /| |_| || || |_| |
 * |____/ \___/   \____|_|_|\___|_| |_|\__|   \_/  \___(_)_(_)___/
 *
 *
 * http://lighter.io/d6
 * MIT License
 *
 * Source files:
 *   https://github.com/zerious/jymin/blob/master/scripts/ajax.js
 *   https://github.com/zerious/jymin/blob/master/scripts/collections.js
 *   https://github.com/zerious/jymin/blob/master/scripts/dom.js
 *   https://github.com/zerious/jymin/blob/master/scripts/events.js
 *   https://github.com/zerious/jymin/blob/master/scripts/forms.js
 *   https://github.com/zerious/jymin/blob/master/scripts/history.js
 *   https://github.com/zerious/jymin/blob/master/scripts/logging.js
 *   https://github.com/zerious/jymin/blob/master/scripts/strings.js
 *   https://github.com/zerious/jymin/blob/master/scripts/types.js
 *   https://github.com/zerious/lighter/blob/master/node_modules/d6/scripts/d6-jymin.js
 */


/**
 * Empty handler.
 */
var doNothing = function () {};

// TODO: Enable multiple handlers using "bind" or perhaps middlewares.
var responseSuccessHandler = doNothing;
var responseFailureHandler = doNothing;

/**
 * Get an XMLHttpRequest object.
 */
var getXhr = function () {
  var Xhr = window.XMLHttpRequest;
  var ActiveX = window.ActiveXObject;
  return Xhr ? new Xhr() : (ActiveX ? new ActiveX('Microsoft.XMLHTTP') : false);
};

/**
 * Make an AJAX request, and handle it with success or failure.
 * @return boolean: True if AJAX is supported.
 */
var getResponse = function (
  url,       // string:    The URL to request a response from.
  body,      // object|:   Data to post. The method is automagically "POST" if body is truey, otherwise "GET".
  onSuccess, // function|: Callback to run on success. `onSuccess(response, request)`.
  onFailure  // function|: Callback to run on failure. `onFailure(response, request)`.
) {
  // If the optional body argument is omitted, shuffle it out.
  if (isFunction(body)) {
    onFailure = onSuccess;
    onSuccess = body;
    body = 0;
  }
  var request = getXhr();
  if (request) {
    onFailure = onFailure || responseFailureHandler;
    onSuccess = onSuccess || responseSuccessHandler;
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
        //+env:debug
        log('[Jymin] Received response from "' + url + '". (' + getResponse._WAITING + ' in progress).');
        //-env:debug
        --getResponse._WAITING;
        var status = request.status;
        var isSuccess = (status == 200);
        var callback = isSuccess ?
          onSuccess || responseSuccessHandler :
          onFailure || responseFailureHandler;
        var data = parse(request.responseText);
        data._STATUS = status;
        data._REQUEST = request;
        callback(data);
      }
    };
    request.open(body ? 'POST' : 'GET', url, true);
    request.setRequestHeader('x-requested-with', 'XMLHttpRequest');
    if (body) {
      request.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    }

    // Record the original request URL.
    request._URL = url;

    // If it's a post, record the post body.
    if (body) {
      request._BODY = body;
    }

    // Record the time the request was made.
    request._TIME = getTime();

    // Allow applications to back off when too many requests are in progress.
    getResponse._WAITING = (getResponse._WAITING || 0) + 1;

    //+env:debug
    log('[Jymin] Sending request to "' + url + '". (' + getResponse._WAITING + ' in progress).');
    //-env:debug
    request.send(body || null);

  }
  return true;
};
/**
 * Iterate over an array, and call a function on each item.
 */
var forEach = function (
  array,   // Array:    The array to iterate over.
  callback // Function: The function to call on each item. `callback(item, index, array)`
) {
  if (array) {
    for (var index = 0, length = getLength(array); index < length; index++) {
      var result = callback(array[index], index, array);
      if (result === false) {
        break;
      }
    }
  }
};

/**
 * Iterate over an array, and call a callback with (index, value), as in jQuery.each
 */
var each = function (
  array,   // Array:    The array to iterate over.
  callback // Function: The function to call on each item. `callback(item, index, array)`
) {
  if (array) {
    for (var index = 0, length = getLength(array); index < length; index++) {
      var result = callback(index, array[index], array);
      if (result === false) {
        break;
      }
    }
  }
};

/**
 * Iterate over an object's keys, and call a function on each key value pair.
 */
var forIn = function (
  object,  // Object*:   The object to iterate over.
  callback // Function*: The function to call on each pair. `callback(value, key, object)`
) {
  if (object) {
    for (var key in object) {
      var result = callback(key, object[key], object);
      if (result === false) {
        break;
      }
    }
  }
};

/**
 * Iterate over an object's keys, and call a function on each (value, key) pair.
 */
var forOf = function (
  object,  // Object*:   The object to iterate over.
  callback // Function*: The function to call on each pair. `callback(value, key, object)`
) {
  if (object) {
    for (var key in object) {
      var result = callback(object[key], key, object);
      if (result === false) {
        break;
      }
    }
  }
};

/**
 * Decorate an object with properties from another object. If the properties
 */
var decorateObject = function (
  object,     // Object: The object to decorate.
  decorations // Object: The object to iterate over.
) {
    if (object && decorations) {
    forIn(decorations, function (key, value) {
      object[key] = value;
    });
    }
    return object;
};

/**
 * Ensure that a property exists by creating it if it doesn't.
 */
var ensureProperty = function (
  object,
  property,
  defaultValue
) {
  var value = object[property];
  if (!value) {
    value = object[property] = defaultValue;
  }
  return value;
};

/**
 * Get the length of an array.
 * @return number: Array length.
 */
var getLength = function (
  array // Array|DomNodeCollection|String: The object to check for length.
) {
  return isInstance(array) || isString(array) ? array.length : 0;
};

/**
 * Get the first item in an array.
 * @return mixed: First item.
 */
var getFirst = function (
  array // Array: The array to get the
) {
  return isInstance(array) ? array[0] : undefined;
};

/**
 * Get the first item in an array.
 * @return mixed: First item.
 */
var getLast = function (
  array // Array: The array to get the
) {
  return isInstance(array) ? array[getLength(array) - 1] : undefined;
};

/**
 * Check for multiple array items.
 * @return boolean: true if the array has more than one item.
 */
var hasMany = function (
  array // Array: The array to check for item.
) {
  return getLength(array) > 1;
};

/**
 * Push an item into an array.
 * @return mixed: Pushed item.
 */
var push = function (
  array, // Array: The array to push the item into.
  item   // mixed: The item to push.
) {
  if (isArray(array)) {
    array.push(item);
  }
  return item;
};

/**
 * Pop an item off an array.
 * @return mixed: Popped item.
 */
var pop = function (
  array // Array: The array to push the item into.
) {
  if (isArray(array)) {
    return array.pop();
  }
};

var merge = function (
  array, // Array:  The array to merge into.
  items  // mixed+: The items to merge into the array.
) {
  // TODO: Use splice instead of pushes to get better performance?
  var addToFirstArray = function (item) {
    array.push(item);
  };
  for (var i = 1, l = arguments.length; i < l; i++) {
    forEach(arguments[i], addToFirstArray);
  }
};

/**
 * Push padding values onto an array up to a specified length.
 * @return number: The number of padding values that were added.
 */
var padArray = function (
  array,       // Array:  The array to check for items.
  padToLength, // number: The minimum number of items in the array.
  paddingValue // mixed|: The value to use as padding.
) {
  var countAdded = 0;
  if (isArray(array)) {
    var startingLength = getLength(array);
    if (startingLength < length) {
      paddingValue = isUndefined(paddingValue) ? '' : paddingValue;
      for (var index = startingLength; index < length; index++) {
        array.push(paddingValue);
        countAdded++;
      }
    }
  }
  return countAdded;
};
/**
 * Get a DOM element by its ID (if the argument is an ID).
 * If you pass in a DOM element, it just returns it.
 * This can be used to ensure that you have a DOM element.
 */
var getElement = function (
  parentElement, // DOMElement|:       Document or DOM element for getElementById. (Default: document)
  id             // string|DOMElement: DOM element or ID of a DOM element.
) {
  if (getLength(arguments) < 2) {
    id = parentElement;
    parentElement = document;
  }
  // If the argument is not a string, just assume it's already an element reference, and return it.
  return isString(id) ? parentElement.getElementById(id) : id;
};

/**
 * Get DOM elements that have a specified tag name.
 */
var getElementsByTagName = function (
  parentElement, // DOMElement|: Document or DOM element for getElementsByTagName. (Default: document)
  tagName        // string|:     Name of the tag to look for. (Default: "*")
) {
  if (getLength(arguments) < 2) {
    tagName = parentElement;
    parentElement = document;
  }
  return parentElement.getElementsByTagName(tagName || '*');
};

/**
 * Get DOM elements that have a specified tag and class.
 */
var getElementsByTagAndClass = function (
  parentElement,
  tagAndClass
) {
  if (getLength(arguments) < 2) {
    tagAndClass = parentElement;
    parentElement = document;
  }
  tagAndClass = tagAndClass.split('.');
  var tagName = (tagAndClass[0] || '*').toUpperCase();
  var className = tagAndClass[1];
  var anyTag = (tagName == '*');
  var elements;
  if (className) {
    elements = [];
    if (parentElement.getElementsByClassName) {
      forEach(parentElement.getElementsByClassName(className), function(element) {
        if (anyTag || (element.tagName == tagName)) {
          elements.push(element);
        }
      });
    }
    else {
      forEach(getElementsByTagName(parentElement, tagName), function(element) {
        if (hasClass(element, className)) {
          elements.push(element);
        }
      });
    }
  }
  else {
    elements = getElementsByTagName(parentElement, tagName);
  }
  return elements;
};

/**
 * Get the parent of a DOM element.
 */
var getParent = function (
  element,
  tagName
) {
  var parentElement = (getElement(element) || {}).parentNode;
  // If a tag name is specified, keep walking up.
  if (tagName && parentElement && parentElement.tagName != tagName) {
    parentElement = getParent(parentElement, tagName);
  }
  return parentElement;
};

/**
 * Create a DOM element.
 */
var createElement = function (
  tagIdentifier
) {
  if (!isString(tagIdentifier)) {
    return tagIdentifier;
  }
  tagIdentifier = tagIdentifier || '';
  var tagAndAttributes = tagIdentifier.split('?');
  var tagAndClass = tagAndAttributes[0].split('.');
  var className = tagAndClass.slice(1).join(' ');
  var tagAndId = tagAndClass[0].split('#');
  var tagName = tagAndId[0] || 'div';
  var id = tagAndId[1];
  var attributes = tagAndAttributes[1];
  var cachedElement = createElement[tagName] || (createElement[tagName] = document.createElement(tagName));
  var element = cachedElement.cloneNode(true);
  if (id) {
    element.id = id;
  }
  if (className) {
    element.className = className;
  }
  // TODO: Do something less janky than using query string syntax (like Ltl).
  if (attributes) {
    attributes = attributes.split('&');
    forEach(attributes, function (attribute) {
      var keyAndValue = attribute.split('=');
      var key = unescape(keyAndValue[0]);
      var value = unescape(keyAndValue[1]);
      element[key] = value;
      element.setAttribute(key, value);
    });
  }
  return element;
};

/**
* Create a DOM element, and append it to a parent element.
*/
var addElement = function (
  parentElement,
  tagIdentifier,
  beforeSibling
) {
  var element = createElement(tagIdentifier);
  if (parentElement) {
    insertElement(parentElement, element, beforeSibling);
  }
  return element;
};

/**
 * Create a DOM element, and append it to a parent element.
 */
var appendElement = function (
  parentElement,
  tagIdentifier
) {
  return addElement(parentElement, tagIdentifier);
};

/**
 * Create a DOM element, and prepend it to a parent element.
 */
var prependElement = function (
  parentElement,
  tagIdentifier
) {
  var beforeSibling = getFirstChild(parentElement);
  return addElement(parentElement, tagIdentifier, beforeSibling);
};

/**
 * Wrap an existing DOM element within a newly created one.
 */
var wrapElement = function (
  element,
  tagIdentifier
) {
  var parentElement = getParent(element);
  var wrapper = addElement(parentElement, tagIdentifier, element);
  insertElement(wrapper, element);
  return wrapper;
};

/**
 * Return the children of a parent DOM element.
 */
var getChildren = function (
  parentElement
) {
  return getElement(parentElement).childNodes;
};

/**
 * Return a DOM element's index with respect to its parent.
 */
var getIndex = function (
  element
) {
  element = getElement(element);
  var index = -1;
  while (element) {
    ++index;
    element = element.previousSibling;
  }
  return index;
};

/**
 * Append a child DOM element to a parent DOM element.
 */
var insertElement = function (
  parentElement,
  childElement,
  beforeSibling
) {
  // Ensure that we have elements, not just IDs.
  parentElement = getElement(parentElement);
  childElement = getElement(childElement);
  if (parentElement && childElement) {
    // If the beforeSibling value is a number, get the (future) sibling at that index.
    if (isNumber(beforeSibling)) {
      beforeSibling = getChildren(parentElement)[beforeSibling];
    }
    // Insert the element, optionally before an existing sibling.
    parentElement.insertBefore(childElement, beforeSibling || null);
  }
};

/**
 * Insert a DOM element after another.
 */
var insertBefore = function (
  element,
  childElement
) {
  element = getElement(element);
  var parentElement = getParent(element);
  addElement(parentElement, childElement, element);
};

/**
 * Insert a DOM element after another.
 */
var insertAfter = function (
  element,
  childElement
) {
  element = getElement(element);
  var parentElement = getParent(element);
  var beforeElement = getNextSibling(element);
  addElement(parentElement, childElement, beforeElement);
};

/**
 * Remove a DOM element from its parent.
 */
var removeElement = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    // Remove the element from its parent, provided that its parent still exists.
    var parentElement = getParent(element);
    if (parentElement) {
      parentElement.removeChild(element);
    }
  }
};

/**
 * Remove children from a DOM element.
 */
var clearElement = function (
  element
) {
  setHtml(element, '');
};

/**
 * Get a DOM element's inner HTML if the element can be found.
 */
var getHtml = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    return element.innerHTML;
  }
};

/**
 * Set a DOM element's inner HTML if the element can be found.
 */
var setHtml = function (
  element,
  html
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    // Set the element's innerHTML.
    element.innerHTML = html;
  }
};

/**
 * Get a DOM element's inner text if the element can be found.
 */
var getText = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    return element.innerText;
  }
};

/**
 * Set a DOM element's inner text if the element can be found.
 */
var setText = function (
  element,
  text
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    // Set the element's innerText.
    element.innerHTML = text;
  }
};

/**
 * Get a DOM element's class name if the element can be found.
 */
var getClass = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    return element.className;
  }
};

/**
 * Set a DOM element's class name if the element can be found.
 */
var setClass = function (
  element,
  className
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    // Set the element's innerText.
    element.className = className;
  }
};

/**
 * Get a DOM element's firstChild if the element can be found.
 */
var getFirstChild = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    return element.firstChild;
  }
};

/**
 * Get a DOM element's previousSibling if the element can be found.
 */
var getPreviousSibling = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    return element.previousSibling;
  }
};

/**
 * Get a DOM element's nextSibling if the element can be found.
 */
var getNextSibling = function (
  element
) {
  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {
    return element.nextSibling;
  }
};

/**
 * Case-sensitive class detection.
 */
var hasClass = function (
  element,
  className
) {
  var pattern = new RegExp('(^|\\s)' + className + '(\\s|$)');
  return pattern.test(getClass(element));
};

/**
 * Add a class to a given element.
 */
var addClass = function (
  element,
  className
) {
  element = getElement(element);
  if (element) {
    element.className += ' ' + className;
  }
};

/**
 * Remove a class from a given element.
 */
var removeClass = function (
  element,
  className
) {
  element = getElement(element);
  if (element) {
    var tokens = getClass(element).split(/\s/);
    var ok = [];
    forEach(tokens, function (token) {
      if (token != className) {
        ok.push(token);
      }
    });
    element.className = ok.join(' ');
  }
};

/**
 * Turn a class on or off on a given element.
 */
var flipClass = function (
  element,
  className,
  flipOn
) {
  var method = flipOn ? addClass : removeClass;
  method(element, className);
};

/**
 * Turn a class on or off on a given element.
 */
var toggleClass = function (
  element,
  className
) {
  var turnOn = false;
  element = getElement(element);
  if (element) {
    turnOn = !hasClass(element, className);
    flipClass(element, className, turnOn);
  }
  return turnOn;
};

/**
 * Insert a call to an external JavaScript file.
 */
var insertScript = function (
  src,
  callback
) {
  var head = getElementsByTagName('head')[0];
  var script = addElement(head, 'script');
  if (callback) {
    script.onload = callback;
    script.onreadystatechange = function() {
      if (isLoaded(script)) {
        callback();
      }
    };
  }
  script.src = src;
};

/**
 * Finds elements matching a selector, and return or run a callback on them.
 */
var all = function (
  parentElement,
  selector,
  callback
) {
  // TODO: Better argument collapsing.
  if (!selector || isFunction(selector)) {
    callback = selector;
    selector = parentElement;
    parentElement = document;
  }
  var elements;
  if (contains(selector, ',')) {
    elements = [];
    var selectors = splitByCommas(selector);
    forEach(selectors, function (piece) {
      var more = all(parentElement, piece);
      if (getLength(more)) {
        merge(elements, more);
      }
    });
  }
  else if (contains(selector, ' ')) {
    var pos = selector.indexOf(' ');
    var preSelector = selector.substr(0, pos);
    var postSelector = selector.substr(pos + 1);
    elements = [];
    all(parentElement, preSelector, function (element) {
      var children = all(element, postSelector);
      merge(elements, children);
    });
  }
  else if (selector[0] == '#') {
    var element = getElement(parentElement, selector.substr(1));
    elements = element ? [element] : [];
  }
  else {
    elements = getElementsByTagAndClass(parentElement, selector);
  }
  if (callback) {
    forEach(elements, callback);
  }
  return elements;
};

/**
 * Finds elements matching a selector, and return or run a callback on them.
 */
var one = function (
  parentElement,
  selector,
  callback
) {
  return all(parentElement, selector, callback)[0];
};
/**
 * Bind a handler to listen for a particular event on an element.
 */
var bind = function (
  element,            // DOMElement|string: Element or ID of element to bind to.
  eventName,          // string:            Name of event (e.g. "click", "mouseover", "keyup").
  eventHandler,       // function:          Function to run when the event is triggered. `eventHandler(element, event, target, customData)`
  customData,         // object|:           Custom data to pass through to the event handler when it's triggered.
  multiBindCustomData
) {
  // Allow multiple events to be bound at once using a space-delimited string.
  if (contains(eventName, ' ')) {
    var eventNames = splitBySpaces(eventName);
    forEach(eventNames, function (singleEventName) {
      bind(element, singleEventName, eventHandler, customData, multiBindCustomData);
    });
    return;
  }

  // Ensure that we have an element, not just an ID.
  element = getElement(element);
  if (element) {

    // Invoke the event handler with the event information and the target element.
    var callback = function(event) {
      // Fall back to window.event for IE.
      event = event || window.event;
      // Fall back to srcElement for IE.
      var target = event.target || event.srcElement;
      // Defeat Safari text node bug.
      if (target.nodeType == 3) {
        target = getParent(target);
      }
      var relatedTarget = event.relatedTarget || event.toElement;
      if (eventName == 'mouseout') {
        while (relatedTarget = getParent(relatedTarget)) { // jshint ignore:line
          if (relatedTarget == target) {
            return;
          }
        }
      }
      return eventHandler(element, event, target, multiBindCustomData || customData);
    };

    // Bind using whatever method we can use.
    if (element.addEventListener) {
      element.addEventListener(eventName, callback, true);
    }
    else if (element.attachEvent) {
      element.attachEvent('on' + eventName, callback);
    }
    else {
      element['on' + eventName] = callback;
    }

    var handlers = (element._HANDLERS = element._HANDLERS || {});
    var queue = (handlers[eventName] = handlers[eventName] || []);
    push(queue, eventHandler);
  }
};

/**
 * Trigger an element event.
 */
var trigger = function (
  element,   // object:        Element to trigger an event on.
  event,     // object|String: Event to trigger.
  target,    // object|:       Fake target.
  customData // object|:       Custom data to pass to handlers.
) {
  if (isString(event)) {
    event = {type: event};
  }
  if (!target) {
    target = element;
  }
  var handlers = element._HANDLERS;
  if (handlers) {
    var queue = handlers[event.type];
    forEach(queue, function (callback) {
      callback(element, event, target, customData);
    });
  }
  if (!event.cancelBubble) {
    element = getParent(element);
    if (element) {
      trigger(element, event, target, customData);
    }
  }
};

/**
 * Stop event bubbling.
 */
var stopPropagation = function (
  event // object: Event to be canceled.
) {
  event.cancelBubble = true;
  if (event.stopPropagation) {
    event.stopPropagation();
  }
};

/**
 * Prevent the default action for this event.
 */
var preventDefault = function (
  event // object: Event to prevent from doing its default action.
) {
  event.preventDefault();
};

/**
 * Bind an event handler for both the focus and blur events.
 */
var bindFocusChange = function (
  element, // DOMElement|string*
  eventHandler,
  customData
) {
  bind(element, 'focus', eventHandler, true, customData);
  bind(element, 'blur', eventHandler, false, customData);
};

/**
 * Bind an event handler for both the mouseenter and mouseleave events.
 */
var bindHover = function (
  element,
  eventHandler,
  customData
) {
  var ieVersion = getBrowserVersionOrZero('msie');
  var HOVER_OVER = 'mouse' + (ieVersion ? 'enter' : 'over');
  var HOVER_OUT = 'mouse' + (ieVersion ? 'leave' : 'out');
  bind(element, HOVER_OVER, eventHandler, true, customData);
  bind(element, HOVER_OUT, eventHandler, false, customData);
};

/**
 * Bind an event handler on an element that delegates to specified child elements.
 */
var on = function (
  element,
  tagAndClass,
  eventName,
  eventHandler,
  customData,
  multiBindCustomData
) {
  tagAndClass = tagAndClass.split('.');
  var tagName = tagAndClass[0].toUpperCase();
  var className = tagAndClass[1];
  var onHandler = function(element, event, target, customData) {
    if (!tagName || (target.tagName == tagName)) {
      if (!className || hasClass(target, className)) {
        return eventHandler(target, event, element, multiBindCustomData || customData);
      }
    }
    // Bubble up to find a tagAndClass match because we didn't find one this time.
    target = getParent(target);
    if (target) {
      onHandler(element, event, target, customData);
    }
  };
  bind(element, eventName, onHandler, customData);
};

/**
 * Bind an event handler for both the mouseenter and mouseleave events.
 */
var onHover = function (
  element,
  tagAndClass,
  eventHandler,
  customData
) {
  on(element, tagAndClass, 'mouseover', eventHandler, true, customData);
  on(element, tagAndClass, 'mouseout', eventHandler, false, customData);
};

/**
 * Bind an event handler for both the mouseenter and mouseleave events.
 */
var bindClick = function (
  element,
  eventHandler,
  customData
) {
  bind(element, 'click', eventHandler, customData);
};

/**
 * Bind a callback to be run after window onload.
 */
var bindWindowLoad = function (
  callback,
  windowObject
) {
  // Default to the run after the window we're in.
  windowObject = windowObject || window;
  // If the window is already loaded, run the callback now.
  if (isLoaded(windowObject.document)) {
    callback();
  }
  // Otherwise, defer the callback.
  else {
    bind(windowObject, 'load', callback);
  }
};

/**
 * Return true if the object is loaded (signaled by its readyState being "loaded" or "complete").
 * This can be useful for the documents, iframes and scripts.
 */
var isLoaded = function (
  object
) {
  var state = object.readyState;
  // In all browsers, documents will reach readyState=="complete".
  // In IE, scripts can reach readyState=="loaded" or readyState=="complete".
  // In non-IE browsers, we can bind to script.onload instead of checking script.readyState.
  return state == 'complete' || (object.tagName == 'script' && state == 'loaded');
};

/**
 * Focus on a specified element.
 */
var focusElement = function (
  element,
  delay
) {
  var focus = function () {
    element = getElement(element);
    if (element) {
      var focusMethod = element.focus;
      if (focusMethod) {
        focusMethod.call(element);
      }
    }
  };
  if (isUndefined(delay)) {
    focus();
  }
  else {
    setTimeout(focus, delay);
  }
};

/**
 * Stop events from triggering a handler more than once in rapid succession.
 */
var doOnce = function (
  method,
  args,
  delay
) {
  clearTimeout(method.t);
  method.t = setTimeout(function () {
    clearTimeout(method.t);
    method.call(args);
  }, delay || 9);
};

/**
 * Set or reset a timeout, and save it for possible cancellation.
 */
var addTimeout = function (
  elementOrString,
  callback,
  delay
) {
  var usingString = isString(elementOrString);
  var object = usingString ? addTimeout : elementOrString;
  var key = usingString ? elementOrString : '_TIMEOUT';
  clearTimeout(object[key]);
  if (callback) {
    if (isUndefined(delay)) {
      delay = 9;
    }
    object[key] = setTimeout(callback, delay);
  }
};

/**
 * Remove a timeout from an element or from the addTimeout method.
 */
var removeTimeout = function (
  elementOrString
) {
  addTimeout(elementOrString, false);
};
/**
 * Get the value of a form element.
 */
var getValue = function (
  input
) {
  input = getElement(input);
  if (input) {
    var type = input.type[0];
    var value = input.value;
    var checked = input.checked;
    var options = input.options;
    if (type == 'c' || type == 'r') {
      value = checked ? value : null;
    }
    else if (input.multiple) {
      value = [];
      forEach(options, function (option) {
        if (option.selected) {
          push(value, option.value);
        }
      });
    }
    else if (options) {
      value = options[input.selectedIndex].value;
    }
    return value;
  }
};

/**
 * Set the value of a form element.
 */
var setValue = function (
  input,
  value
) {
  input = getElement(input);
  if (input) {
    var type = input.type[0];
    var options = input.options;
    if (type == 'c' || type == 'r') {
      input.checked = value ? true : false;
    }
    else if (options) {
      var selected = {};
      if (input.multiple) {
        if (!isArray(value)) {
          value = splitByCommas(value);
        }
        forEach(value, function (val) {
          selected[val] = true;
        });
      }
      else {
        selected[value] = true;
      }
      value = isArray(value) ? value : [value];
      forEach(options, function (option) {
        option.selected = !!selected[option.value];
      });
    }
    else {
      input.value = value;
    }
  }
};
/**
 * Return a history object.
 */
var getHistory = function () {
  var history = window.history || {};
  forEach(['push', 'replace'], function (key) {
    var fn = history[key + 'State'];
    history[key] = function (href) {
      if (fn) {
        fn.apply(history, [null, null, href]);
      } else {
        // TODO: Create a backward compatible history push.
      }
    };
  });
  return history;
};

/**
 * Push an item into the history.
 */
var pushHistory = function (
  href
) {
  getHistory().push(href);
};

/**
 * Replace the current item in the history.
 */
var replaceHistory = function (
  href
) {
  getHistory().replace(href);
};

/**
 * Go back.
 */
var popHistory = function (
  href
) {
  getHistory().back();
};

/**
 * Listen for a history change.
 */
var onHistoryPop = function (
  callback
) {
  bind(window, 'popstate', callback);
};
/**
 * Log values to the console, if it's available.
 */
var error = function () {
  ifConsole('error', arguments);
};

/**
 * Log values to the console, if it's available.
 */
var warn = function () {
  ifConsole('warn', arguments);
};

/**
 * Log values to the console, if it's available.
 */
var info = function () {
  ifConsole('info', arguments);
};

/**
 * Log values to the console, if it's available.
 */
var log = function () {
  ifConsole('log', arguments);
};

/**
 * Log values to the console, if it's available.
 */
var trace = function () {
  ifConsole('trace', arguments);
};

/**
 * Log values to the console, if it's available.
 */
var ifConsole = function (method, args) {
  var console = window.console;
  if (console && console[method]) {
    console[method].apply(console, args);
  }
};
/**
 * Ensure a value is a string.
 */
var ensureString = function (
  value
) {
  return isString(value) ? value : '' + value;
};

/**
 * Return true if the string contains the given substring.
 */
var contains = function (
  string,
  substring
) {
  return ensureString(string).indexOf(substring) > -1;
};

/**
 * Return true if the string starts with the given substring.
 */
var startsWith = function (
  string,
  substring
) {
  return ensureString(string).indexOf(substring) == 0; // jshint ignore:line
};

/**
 * Trim the whitespace from a string.
 */
var trim = function (
  string
) {
  return ensureString(string).replace(/^\s+|\s+$/g, '');
};

/**
 * Split a string by commas.
 */
var splitByCommas = function (
  string
) {
  return ensureString(string).split(',');
};

/**
 * Split a string by spaces.
 */
var splitBySpaces = function (
  string
) {
  return ensureString(string).split(' ');
};

/**
 * Return a string, with asterisks replaced by values from a replacements array.
 */
var decorateString = function (
  string,
  replacements
) {
  string = ensureString(string);
  forEach(replacements, function(replacement) {
    string = string.replace('*', replacement);
  });
  return string;
};

/**
 * Perform a RegExp match, and call a callback on the result;
  */
var match = function (
  string,
  pattern,
  callback
) {
  var result = string.match(pattern);
  if (result) {
    callback.apply(string, result);
  }
};

/**
 * Reduce a string to its alphabetic characters.
 */
var extractLetters = function (
  string
) {
  return ensureString(string).replace(/[^a-z]/ig, '');
};

/**
 * Reduce a string to its numeric characters.
 */
var extractNumbers = function (
  string
) {
  return ensureString(string).replace(/[^0-9]/g, '');
};

/**
 * Returns a lowercase string.
 */
var lower = function (
  object
) {
  return ensureString(object).toLowerCase();
};

/**
 * Returns an uppercase string.
 */
var upper = function (
  object
) {
  return ensureString(object).toUpperCase();
};

/**
 * Return an escaped value for URLs.
 */
var escape = function (value) {
  return encodeURIComponent(value);
};

/**
 * Return an unescaped value from an escaped URL.
 */
var unescape = function (value) {
  return decodeURIComponent(value);
};

/**
 * Returns a query string generated by serializing an object and joined using a delimiter (defaults to '&')
 */
var buildQueryString = function (
  object
) {
  var queryParams = [];
  forIn(object, function(key, value) {
    queryParams.push(escape(key) + '=' + escape(value));
  });
  return queryParams.join('&');
};

/**
 * Return the browser version if the browser name matches or zero if it doesn't.
 */
var getBrowserVersionOrZero = function (
  browserName
) {
  var match = new RegExp(browserName + '[ /](\\d+(\\.\\d+)?)', 'i').exec(navigator.userAgent);
  return match ? +match[1] : 0;
};
/**
 * Return true if a variable is a given type.
 */
var isType = function (
  value, // mixed:  The variable to check.
  type   // string: The type we're checking for.
) {
  return typeof value == type;
};

/**
 * Return true if a variable is undefined.
 */
var isUndefined = function (
  value // mixed:  The variable to check.
) {
  return isType(value, 'undefined');
};

/**
 * Return true if a variable is boolean.
 */
var isBoolean = function (
  value // mixed:  The variable to check.
) {
  return isType(value, 'boolean');
};

/**
 * Return true if a variable is a number.
 */
var isNumber = function (
  value // mixed:  The variable to check.
) {
  return isType(value, 'number');
};

/**
 * Return true if a variable is a string.
 */
var isString = function (
  value // mixed:  The variable to check.
) {
  return isType(value, 'string');
};

/**
 * Return true if a variable is a function.
 */
var isFunction = function (
  value // mixed:  The variable to check.
) {
  return isType(value, 'function');
};

/**
 * Return true if a variable is an object.
 */
var isObject = function (
  value // mixed:  The variable to check.
) {
  return isType(value, 'object');
};

/**
 * Return true if a variable is an instance of a class.
 */
var isInstance = function (
  value,     // mixed:  The variable to check.
  protoClass // Class|: The class we'ere checking for.
) {
  return value instanceof (protoClass || Object);
};

/**
 * Return true if a variable is an array.
 */
var isArray = function (
  value // mixed:  The variable to check.
) {
  return isInstance(value, Array);
};

/**
 * Return true if a variable is a date.
 */
var isDate = function (
  value // mixed:  The variable to check.
) {
  return isInstance(value, Date);
};
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

  /**
   * Initialization binds event handlers.
   */
  var init = function () {

    // When a same-domain link is clicked, fetch it via XMLHttpRequest.
    on('a', 'click', function (a, event) {
      var url = removeHash(a.href);
      var buttonNumber = event.which;
      var isLeftClick = (!buttonNumber || (buttonNumber == 1));
      if (isSameDomain(url) && isLeftClick) {
        preventDefault(event);
        loadUrl(url, 0, a);
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
      pushHistory(responseUrl);

      // If we render this page again, we'll want fresh data.
      delete cache[requestUrl];
    }
  };

  /**
   * Overwrite the page with new HTML, and execute embedded scripts.
   */
  var writeHtml = function (html, targetSelector) {
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
      onReady(document);
    }
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

