var http = require('http');

/**
 * Append the D6 count to the redirect.
 */
http.ServerResponse.prototype.redirect = function (location) {
  var res = this;
  // If this is an XMLHttpRequest from D6, indicate it in the redirect URL.
  if (res.request.query.d6) {
    location += (location.indexOf('?') < 0 ? '?' : '&') + 'd6=r';
  }
  res.statusCode = 302;
  res.setHeader('location', location);
  res.end();
};
