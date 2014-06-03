var zlib = require('zlib');

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
      var code = 'd6({' + pairs.join(',') + '});';
      zlib.gzip(code, function (err, zipped) {
        app.server.get('/d6.js', function (request, response, next) {
          response.statusCode = 200;
          response.setHeader('content-type', 'text/javascript');
          if (response.zip) {
            response.zip(code, zipped);
          }
          else {
            response.end(code);
          }
        });
      });
    });

  });
}

/**
 * Expose the version to module users.
 */
d6.version = require('./package.json').version;
