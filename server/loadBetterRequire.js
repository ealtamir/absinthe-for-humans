var loadBetterRequire = function() {
  var temp  = null;
  var _c_   = null;
  var _c    = null;

  if (global._require === void(0)) {
    global._require = require;
  }

  // Refer to https://gist.github.com/KenanSulayman/5281658.
  return function(k) {
    try {
      if (k[0] === '.') {
        k = process.cwd() + '/' +  k;
      }
      console.log(k);
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
};

exports.loadBetterRequire = loadBetterRequire;
