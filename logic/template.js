/* global _path */
/* global fs */
/* global config */

var jade = require('jade');

exports.name = 'template';

var views = (function() {
  'use strict';
  var views_dir = _path.join(process.cwd(), 'views'),
      files     = fs.readdirSync(views_dir),
      temp      = null,
      templates = {};

  files.forEach(function(file) {
    temp = file.split('.');
    temp[1] === 'jade' &&
      (templates[temp[0]] = _path.join(views_dir, file));
  });

  return templates;
}());

exports.compile = (function() {
  'use strict';

  // Objects used to cache html strings.
  var loaded  = {},
      html    = {}, // used for contextless templates
      options = {
        filename      : 'default filename',
        pretty        : true,
        debug         : false,
        compileDebug  : true
      };

  return function(temp_name, response, context) {
    if (context === undefined && html[temp_name] !== undefined) {
      return response.end(html[temp_name]);

    } else if (context !== undefined && loaded[temp_name] !== undefined) {
      return response.end(loaded[temp_name](context));

    } else {
      var file = fs.createReadStream(views[temp_name]);
      var buffer = '';

      file.on('data', function(chunk) {
        buffer += chunk;
      });

      file.on('end', function() {
        var fn = jade.compile(buffer, options);
        if (context === undefined) {
          html[temp_name] = fn();
          return response.end(html[temp_name]);
        } else {
          context.prototype = options;
          loaded[temp_name] = fn;
          return response.end(fn(context));
        }
      });

      file.on('error', function() {
        console.log('There was a problem reading file: ' +
                    temp_name);
        process.exit(1);
      });
    }
  };
}());
