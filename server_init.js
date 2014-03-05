var helpers = require('./helpers');

exports.server_init = function init() {

  GLOBAL._require = GLOBAL.require;
  GLOBAL.require = loadBetterRequire();

  // Configuration
  GLOBAL.config = require('./lib/config').config;


  importGlobalModules();

  // Check if using V8 engine
  checkV8();

  loadControllersAndLogics();

}

var importGlobalModules = function() {
  var imports = [
      'child_process'
    , 'path'
    , 'crypto'
    , 'fs'
    , 'http'
    , 'https'
    , 'mime'
    , 'repl'
    , 'spdy'
    , 'url'
    , 'util'
    , 'zlib'
  ];

  imports.forEach(function(v, i, arr) {
    if (v === 'path') {
      GLOBAL['_path'] = require(v);
    } else {
      GLOBAL[v] = require(v);
    }
  });
};

var checkV8 = function() {
  try {
    delete e;
    e;
  } catch(e) {
    GLOBAL.v8 = e.stack != void(0);
  } finally {
    GLOBAL.v8 = GLOBAL.v8 || 0;
  }
};

var loadControllersAndLogics = function() {
  GLOBAL.controller = {};
  helpers.loadControllerModules(controller);

  // Load logical modules
  GLOBAL.logic = {};
  helpers.loadLogicModules(logic);
};

var loadBetterRequire = function() {
  var temp  = null;
  var _c_   = null;
  var _c    = null;

  if (GLOBAL._require === void(0)) {
    GLOBAL._require = require;
  }

  // Refer to https://gist.github.com/KenanSulayman/5281658.
  return function(k) {
    try {
      return _require(k);
    } catch (e) {
      if (v8) {
        _ = e.stack.split('\n'); // TODO: It is not clear what e.stack is.
        __ = '';
        for (var a in _) {
          if (_.hasOwnProperty(a)) {
            temp = _[a].match(/\(([^)]+)\)/g);
            if (temp !== null) {
              __ += (new Array(+a + 1)).join(' ') + '=> ' + temp + '\n';
            }
          }
        }
        console.log(_[0], '[' + k + ']\n', __);
        process.exit();
      } else {
        console.trace('=== FATAL ERROR: \'' + k + '\' ===');
        process.exit();
      }
    }
  };
}
