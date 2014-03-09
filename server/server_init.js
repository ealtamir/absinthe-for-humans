var helpers = require('../helpers');

var importGlobalModules = function(require) {
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

var checkIfV8 = function(v8) {
  try {
    delete e;
    e;
  } catch(e) {
    v8 = e.stack !== void(0);
  } finally {
    v8 = v8 || 0;
  }
};

var loadControllersAndLogics = function(controller, logic) {
  helpers.loadControllerModules(controller);
  helpers.loadLogicModules(logic);
};


var changeFSReadStream = (function() {
  var _fs_cache = {};

  return function() {
    fs._createReadStream = fs.createReadStream;

    fs.createReadStream = function(path, options) {
      options = options || {};

      // whereas path is fd_ref && options is typeof object
      // __ if path, options do not statisfy (String path, Object options)
      // forward to base implementation.
      if (typeof path === 'string' &&
          typeof options === 'object' &&
          Object.keys(options).length > 0) {
        return fs._createReadStream.apply(this, arguments);
      }

      if (_fs_cache[path]) {
        return _fs_cache[path];
      }

      _fs_cache[path] = new MemCache();

      // Sends contents of file at 'path' to a buffer
      fs._createReadStream(path, options).pipe(_fs_cache[path]);
      return _fs_cache[path];
    };
  };
})();

exports.importGlobalModules       =  importGlobalModules;
exports.changeFSReadStream        =  changeFSReadStream;
exports.loadControllersAndLogics  =  loadControllersAndLogics;
exports.checkIfV8                 =  checkIfV8;
