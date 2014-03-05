exports._hr_mutate = _hr_mutate;
exports.better_require = better_require;

exports.loadLogicModules = function() {
  return extension_loaders('logic');
};
exports.loadControllerModules = function() {
  return extension_loaders('controller');
};

var _hr_mutate = function(init) {
  'use strict';
  init = process.hrtime(init); // [seconds, nanoseconds]

  // Seconds
  var mili  = init[1] / 1E6;
  var micro = (init[1] / 1E3) - (~~mili * 1E3);
  var nano  = micro % 1 * 1E3; // XXX % 1 always returns 0.

  // For ~~ information refer to:
  // http://james.padolsey.com/javascript/double-bitwise-not/
  return init[0] + 's ' + ~~mili + 'ms' +
      ' ' + ~~micro + 'µs' + ' ' + ~~nano + 'ns';
};


var extension_loaders = function(type, obj) {
  var temp = null;
  require('fs').readdirSync('./' + type).forEach(
    temp = file.split('.');
    if (temp[1] === 'js') {
      obj[temp[0]] = require('./' + type + '/' + file);
    }
  );
};

// Prints routes loaded from controllers if any exist.
var printLoadedControllers = function(cont_obj) {
  var temp  = null;
  var _c_   = null;
  var _c    = null;

  if (!doCluster) {
    _c_ = [];
    for (_c in cont_obj) {
      if (cont_obj.hasOwnProperty(_c)) {
        temp = '\'' + cont_obj[_c].name + '\'[.js] => ' +
          (cont_obj[_c].paths.length > 0)?
            cont_obj[_c].paths.join(', ') : '<virtual>';
        _c_.push(temp);
      }
    }
    if (_c_.length) {
      console.log('Initialized Routers:\n\t' + _c_.join('\n\t') + '\n');
    }
  }
};

var printLoadedLogics = function(logic_obj) {
  var temp  = null;
  var _c_   = null;
  var _c    = null;

  if (!doCluster) {
    // _c_ and _c previously defined
    _c_ = [];
    for (_c in logic_obj) {
      if (logic_obj.hasOwnProperty(_c)) {
        _c_.push('\'' + logic_obj[_c].name + '\'');
      }
    }
    if (_c_.length) {
      console.log('Initialized logic_objs:\n\t' + _c_.join('\n\t') + '\n');
    }
  }
};
