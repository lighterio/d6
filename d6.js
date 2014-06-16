var zlib = require('zlib');
var http = require('./lib/http');

/**
 * Accept an app that has an Express-like server and chugged views.
 */
var d6 = module.exports = function (app) {

  app.chug.onReady(function () {

    var server = app.server;
    var views = app.views;

    // Iterate over the views building an array of key-value pair strings.
    var pairs = [];
    views.each(function (asset) {
      var compiled = asset.getCompiledContent();
      var minified = asset.getMinifiedContent();
      var key = compiled.key.replace(/"/g, '\\"');
      pairs.push('"' + key + '":' + minified.toString());
    });

    // Route the views with pre-zipping so clients can download them quickly.
    views.then(function () {
      var env = process.env.NODE_ENV || 'prod';
      var isDevOrDebug = (env[0] == 'd');
      var br = isDevOrDebug ? '\n' : '';
      var tab = isDevOrDebug ? '  ' : '';
      // TODO: Allow views to be separated into batches to reduce payload.
      var url = '/d6.js';
      var code = 'D6({' + br + tab + pairs.join(',' + br + tab) + br + '});';
      zlib.gzip(code, function (err, zipped) {
        app.server.get(url, function (request, response, next) {
          response.statusCode = 200;
          response.setHeader('content-type', 'text/javascript');
          if (response.zip) {
            response.zip(code, zipped);
          }
          else {
            response.end(code);
          }
        });
        app.logger.info('[D6] Views routed to "' + url + '".');
      });
    });

  });
};

/**
 * Expose the version to module users.
 */
d6.version = require('./package.json').version;
