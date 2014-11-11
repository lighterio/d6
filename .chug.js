var cwd = process.cwd();
var pkg = require(cwd + '/package.json');

exports.version = pkg.version;

require('figlet').text('D6 Client v' + exports.version, {font: 'Standard'}, function (err, figlet) {

  figlet = figlet.replace(/\n/g, '\n *');

  var source = require('chug')([
    cwd + '/node_modules/jymin/scripts/ajax.js',
    cwd + '/node_modules/jymin/scripts/arrays.js',
    cwd + '/node_modules/jymin/scripts/dom.js',
    cwd + '/node_modules/jymin/scripts/events.js',
    cwd + '/node_modules/jymin/scripts/forms.js',
    cwd + '/node_modules/jymin/scripts/history.js',
    cwd + '/node_modules/jymin/scripts/logging.js',
    cwd + '/node_modules/jymin/scripts/objects.js',
    cwd + '/node_modules/jymin/scripts/strings.js',
    cwd + '/node_modules/jymin/scripts/types.js',
    cwd + '/scripts/d6-jymin.js'
  ]);

  source.concat('d6.js')
    .each(function (asset) {
      var locations = source.getLocations();
      locations.forEach(function (location, index) {
        locations[index] = location.replace(
          /^.*\/(node_modules|workspace)\/(\w+)\/(.*?)$/i,
          ' *   https://github.com/lighterio/$2/blob/master/$3');
      });
      asset.setContent((
        "/**\n" +
        " *" + figlet + "\n" +
        " *\n" +
        " * http://lighter.io/d6\n" +
        " * MIT License\n" +
        " *\n" +
        " * Source files:\n" +
        locations.join("\n") + "\n" +
        " */\n\n\n" +
        asset.getContent() + "\n").replace(/[\t ]*\n/g, '\n'));
    })
    .wrap('window')
    .minify()
    .write(cwd, 'd6-client.js')
    .write(cwd, 'd6-client.min.js', 'minified');

});
