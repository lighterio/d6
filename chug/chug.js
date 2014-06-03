var cwd = process.cwd();

exports.version = require('../package.json').version;

require('figlet').text('D6 Client v' + exports.version, {font: 'Standard'}, function (err, figlet) {

  figlet = figlet.replace(/\n/g, '\n *');

  var source = require('chug')([
    'node_modules/jymin/scripts/ajax.js',
    'node_modules/jymin/scripts/collections.js',
    'node_modules/jymin/scripts/dom.js',
    'node_modules/jymin/scripts/events.js',
    'node_modules/jymin/scripts/logging.js',
    'node_modules/jymin/scripts/strings.js',
    'node_modules/jymin/scripts/types.js',
    'scripts/d6-jymin.js'
  ]);

  source.concat('d6.js')
    .each(function (asset) {
      var locations = source.getLocations();
      locations.forEach(function (location, index) {
        locations[index] = location.replace(
          /^.*\/(node_modules|[Ww]ork[Ss]?p?a?c?e?)\/([a-z]+)\/(.*?)$/,
          ' *   https://github.com/zerious/$2/blob/master/$3');
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
        asset.getContent() + "\n" +
        "window.getD6 = getD6;\n").replace(/[\t ]*\n/g, '\n'));
    })
    .wrap('window')
    .minify()
    .write(cwd, 'd6-client.js')
    .write(cwd, 'd6-client.min.js', 'minified');

});
