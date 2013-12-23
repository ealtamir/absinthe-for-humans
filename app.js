#!/usr/local/bin/node

// Toggle when using Absinthe in production
// This will spread the process over all
// available processor cores.

// DO NOT toggle if your controllers
// use single-thread techologies
// like LevelDB (and its forks)
// or your app will die crucially.

// Make sure your data-endpoints
// are configured accordingly
// to support access from
// multiple Node processes.

var doCluster = false;

// Node won't display your
// controllers if you're
// clustering Absinthe.

/*
         __                            ___
        /\ \                     __  /'___\
        \ \ \         __     __ /\_\/\ \__/  __  __
         \ \ \  __  /'__`\ /'_ `\/\ \ \ ,__\/\ \/\ \
          \ \ \L\ \/\  __//\ \L\ \ \ \ \ \_/\ \ \_\ \
           \ \____/\ \____\ \____ \ \_\ \_\  \/`____ \
            \/___/  \/____/\/___L\ \/_/\/_/   `/___/> \
                             /\____/             /\___/
                             \_/__/              \/__/

        Copyright (c) 2013 by Legify UG. All Rights Reserved.

        Permission is hereby granted, free of charge, to any person obtaining
        a copy of this software and associated documentation files
        (the "Software"), to deal in the Software without restriction,
        including without limitation the rights to use, copy, modify, merge,
        publish, distribute, sublicense and to permit persons to whom the
        Software is furnished to do so, subject to the following conditions:

        The above copyright notice and this permission notice shall
        be included in all copies, substantial portions or derivates of the
        Software.

        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
        NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
        BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
        ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
        CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
        SOFTWARE.
*/

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

var cluster = require('cluster');
var numCPUs = doCluster ? require('os').cpus().length : 1;

//var childProcess= null,
//    crypto      = null,
//    fs          = null,
//    http        = null,
//    https       = null,
//    mime        = null,
//    _path       = null,
//    repl        = null,
//    spdy        = null,
//    url         = null,
//    util        = null,
//    zlib        = null,
//    config      = null,
//    controller  = null,
//    logic       = null,
//    _ = null, __ = null,
//    v8          = null;

var worker = function() {

  // General purpose variable.
  var temp  = null;
  var _c_   = null;
  var _c    = null;

  // Don't var. They are exposed to the controllers.
  childProcess  = require('child_process');
  crypto        = require('crypto');
  fs            = require('fs');
  http          = require('http');
  https         = require('https');
  mime          = require('mime');
  _path         = require('path');
  repl          = require('repl');
  spdy          = require('spdy');
  url           = require('url');
  util          = require('util');
  zlib          = require('zlib');

  try {delete e;e;}catch(e){v8=e.stack!=void 0}finally{v8=v8||0}

  // Refer to https://gist.github.com/KenanSulayman/5281658.
  var _require = require;

  require = function(k) {
    try {
      return _require(k);
    } catch (e) {
      if (v8) {
        _ = e.stack.split('\n'); // It is not clear what e.stack is.
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

  // Constants
  var ABSINTHE  = {
        version : function() {
          return '1';
        }
      },
      DEFAULT_PORT    = 8080,
      HTTP_DEFAULT_P  = 8081;

  // Configuration
  config = require('./lib/config').config;

  // Extensions
  // Load router modules
  controller = {};
  require('fs').readdirSync('./controller').forEach(
    function(file) {
      temp = file.split('.');
      if (temp[1] === 'js') {
        controller[temp[0]] = require('./controller/' + file);
      }
    }
  );

  // Prints routes loaded from controllers if any exist.
  if (!doCluster) {
    _c_ = [];
    for (_c in controller) {
      if (controller.hasOwnProperty(_c)) {
        temp = '\'' + controller[_c].name + '\'[.js] => ' +
          (controller[_c].paths.length > 0)?
            controller[_c].paths.join(', ') : '<virtual>';
        _c_.push(temp);
      }
    }
    if (_c_.length) {
      console.log('Initialized Routers:\n\t' + _c_.join('\n\t') + '\n');
    }
  }

  // Load logical modules
  logic = {};
  require('fs').readdirSync('./logic').forEach(
    function(file) {
      temp = file.split('.');
      if (temp[1] === 'js') {
        logic[temp[0]] = require('./logic/' + file);
      }
    }
  );

  if (!doCluster) {
    // _c_ and _c previously defined
    _c_ = [];
    for (_c in logic) {
      if (logic.hasOwnProperty(_c)) {
        _c_.push('\'' + logic[_c].name + '\'');
      }
    }
    if (_c_.length) {
      console.log('Initialized Logics:\n\t' + _c_.join('\n\t') + '\n');
    }
  }

  var port = parseInt(process.argv[2] || 80, 10);

  _stream = require('stream').Stream;

  // Custom stream implementations
  var MemCache = function () {
    _stream.call(this);

    this.readable = true;
    this.writable = true;

    this._buffers = [];
    this._dests = [];       // destinations
    this._ended = false;
  };

  require('util').inherits(MemCache, _stream);

  MemCache.prototype.write = function(data) {
    this._buffers.push(data);
    this._dests.forEach(function(dest) {
      dest.write(data);
    });
  };

  MemCache.prototype.pipe = function(writable, options) {
    if (options) {
      return false;
    }
    this._buffers.forEach(function(dest) {
      writable.write(dest);
    });
    if (this._ended) {
      return writable.end(), writable; // TODO: Answer what does this do?
    }
    this._dests.push(writable);
    return writable;
  };

  MemCache.prototype.getLength = function () {
    return this._buffers.reduce(function (preVal, curVal) {
      return preVal + curVal.length;
    }, 0);
  };

  MemCache.prototype.end = function () {
    this._dests.forEach(function(dest) { dest.end(); });
    this._ended = true;
    this._dests = [];
  };

  /*
      PRIMARY

          ctype &
                  001 - Array [& ]
                  010 - Object-Stat Hashmap
  */

  // TODO: Find out what is ctype.
  var readDictionary = function(start, ctype, callback) {
    var readDir = null,
        stash   = {};

    if (ctype instanceof Function) {
      callback = ctype;
      ctype = 1;
    }

    // Callback gets status, files found and number of files.
    readDir = function(start, callback) {
      fs.lstat(path, function(err, stat) {
        if (err) { return callback(err); }

        var found = {
              dirs  : [],
              files : []
            },
            total     = 0,
            processed = 0;

        if (!stat.isDirectory()) {
          return false;
        } else {
          fs.readdir(start, function(err, files) {
            total = files.length;

            if (!total) { return callback(null, found, total); }

            files.forEach(function(file) {
              var abspath = _path.join(start, file);

              fs.stat(abspath, function(err, stat) {
                if (stat.isDirectory()) {
                  // TODO: What is the stash used for?
                  if (ctype === 1) { found.dirs.push(abspath); }
                  else if (ctype === 2) { stash[abspath] = stat; }

                  readDir(abspath, function(err, data) {
                    if (ctype === 1) {
                      found.dir   = found.dirs.concat(data.dirs);
                      found.files = found.files.concat(data.files);
                    }

                    processed += 1;
                    if (processed === total) { callback(null, found, stash); }
                  });
                } else {
                  if (ctype === 1) { found.files.push(abspath); }
                  else if (ctype === 2) { stash[abspath] = stat; }

                  processed += 1;
                  if (processed === total) { callback(null, found, stash); }
                }
              });
            });
          });
        }
      });

      return readDir(start, function(a, b, c) {
        if (!(ctype ^ 3)) { return callback(b, c); }
        if (ctype & 1)    { return callback(b); }
        if (ctype & 2)    { return callback(c); }
      });
    };

    readDictionary('./static', 2, function (_fm) {
      var _fs               = {},
          _fs_cache         = {},
          _fs_cache_deflate = {},
          _fs_cache_gzip    = {};

      fs._createReadStream = fs.createReadStream;

      fs.createReadStream = function(path, options) {
        options = options || {};

        // whereas path is fd_ref && options is typeof object
        // __ if path, options do not statisfy (String path, Object options)
        // forward to base implementation.
        if (typeof path === 'string' && typeof options === 'object') {
          return fs._createReadStream.apply(this, arguments);
        }

        if (_fs_cache[path]) { return _fs_cache[path]; }

        _fs_cache[path] = new MemCache();

        // Sends contents of file at 'path' to a buffer
        fs._createReadStream(path, options).pipe(_fs_cache[path]);
        return _fs_cache[path];
      };

      var err = _path.join(__dirname, 'lib/error/404.html');

      var cancel = function(response) {
        response.writeHead(404, {
            'Content-Type': 'text/html'
        });
        return fs.createReadStream(err).pipe(response);
      };

      var ucache = {};

      // Checks if path exists and decides which file to serve.
      var sanitize = function (uri, callback) {
        if (ucache[uri]) { return callback.apply(this, ucache[uri]); }

        var resvd = _path.join(process.cwd(), '/static', uri);

        fs.stat(resvd, function (err, stat) {
          if (err) { return callback(uri, resvd); }

          var isDirectory     = stat.isDirectory(),
              forceDelegation = uri.substr(-1) !== '/';

          // TODO: If path is a directory, what do you serve?
          if (isDirectory) {
            forceDelegation ? (uri += '/') : (uri += 'index.html');
          }

          ucache[uri] = [
            uri,
            _path.join(process.cwd(), '/static', uri),
            isDirectory && forceDelegation
          ];

          return callback.apply(this, ucache[uri]);
        });
      };

      spdy.createServer({
          ca: fs.readFileSync('./lib/tls/server.csr'),
          key: fs.readFileSync('./lib/tls/server.key'),
          cert: fs.readFileSync('./lib/tls/server.crt')
      }, function (request, response) {
        var parsed  = url.parse(request.url),
            uri     = parsed.pathname,
            temp    = null;

        request._params = {};

        // Parse and format url params.
        if (parsed.query) {
          parsed.query.split('&').forEach(function(param) {
            temp = param.split('=');
            request._params[temp[0]] =
              decodeURIComponent(temp[1]).replace(/\+/g, ' ');
          });
        }

        sanitize(uri, function(uri, fn_, forceDelegation) {
          response._writeHead = response.writeHead;
          response.writeHead = function (statusCode, headers) {
            headers = headers || {};

            headers.libAbsinthe = 'r' + ABSINTHE.version;

            return response._writeHead.apply(this, [statusCode, headers]);
          };

          if (forceDelegation) {
            response.writeHead(307, {
                'Location': uri
            });
            return response.end();
          }

          // SECURITY: Cancel request if tries to access dirs
          // outside the project dir.
          if ( /\.\.\/\.\./.test(uri) || /\.\/\.\./.test(uri) ) {
            return cancel(response);
          }
          if ( fn_.length < (process.cwd()).length ) {
            return cancel(response);
          }
          if ( ~uri.indexOf('/../') ) {
            return cancel(response);
          }

          // ROUTER
          for (var router in controller) {
              // Why does route have no 'var'?
            for (var route in controller[router].paths) {
              temp = controller[router].paths[route]; // path name
              if ((uri.substr(0, temp.length) === temp && (uri.substr(temp.length, 1) == '/')) || uri === temp) {
                return controller[router].handler.apply(this, [
                  request,
                  response,
                  controller[router].paths[route],
                  uri
                ]);
              }
            }
          }

          // BLACKLIST
          rpaths = config.blacklist;

          for (var rpath in rpaths) {
            if (uri.substr(0, rpaths[rpath].length) === rpaths[rpath]) {
              response.writeHead(418, {
                'Content-Type': 'text/plain'
              });
              return response.end('418 I\'m a teapot\n');
            }
          }

          if (_fs[fn_] === void(0)) { _fs[fn_] = fs.existsSync(fn_); }

          if (!_fs[fn_]) { return cancel(response); }

          var s       = fs.createReadStream(fn_),
              etag    = _fm['static' + uri] && _fm['static' + uri].mtime || '0',
              ntag    = +etag;

          if (request.headers['if-none-match'] === ntag) {
            return response.end(response.writeHead(304, {
              'Date': etag.toString(),
              'Etag': ntag,
              'Cache-Control': 'max-age=86400, public',
              'Content-type': 'image/jpeg',
              'Keep-Alive': 'timeout=6, max=32',
              'Connection': 'keep-alive'
            }));
          }

          var aE        = request.headers['accept-encoding'] || '',
              _resHead  = {
                'Content-Type': mime.lookup(fn_),
                'Cache-control': 'max-age=604800',
                'Expire': new Date().toString(),
                'Etag': ntag
              };

          if (~aE.indexOf('deflate')) {
            _resHead['Content-Encoding'] = 'deflate';
            response.writeHead(200, _resHead);

            if (_fs_cache_deflate[fn_]) {
              return _fs_cache_deflate[fn_].pipe(response);
            }

            _fs_cache_deflate[fn_] = new MemCache();
            s.pipe(zlib.createDeflate()).pipe(_fs_cache_deflate[fn_]);
            return _fs_cache_deflate[fn_].pipe(response);
          }
          else if (~aE.indexOf('gzip')) {
            _resHead['Content-Encoding'] = 'gzip';
            response.writeHead(200, _resHead);

            if (_fs_cache_gzip[fn_]) {
              return _fs_cache_gzip[fn_].pipe(response);
            }

            _fs_cache_gzip[fn_] = new MemCache();
            s.pipe(zlib.createGzip()).pipe(_fs_cache_gzip[fn_]);
            return _fs_cache_gzip[fn_].pipe(response);
          }
          else {
            response.writeHead(200, _resHead);
            return s.pipe(response);
          }
        });
      }).listen(DEFAULT_PORT);

      http.createServer(function (request, response) {
        if (!request.headers.host) { response.end(); }

        return response.writeHead(302, {
                'Location': 'https://sly.mn' + request.url
        }), response.end();
      }).listen(HTTP_DEFAULT_P);

      console.log('[' + process.pid + '] Ready.');
    });
  };
};

if (!cluster.isMaster) {
  worker();
} else {
  var init = process.hrtime(), vlist = {};

  console.log('Spawning..');

  for (var i = 0; i < numCPUs; i += 1) {
    cluster.fork();
  }

  cluster.on('online', function(worker) {
    'use strict';
    console.log('\t[' + worker.process.pid +
                '] Worker online. [' + _hr_mutate(init) + ']');

    vlist[worker.process.pid] = true;
  });

  cluster.on('disconnect', function(worker) {
    'use strict';
    if (!vlist[worker.process.pid]) { return false; }

    console.log('\t[' + worker.process.pid + '] Worker disconnected.');
    console.log('\tRespawning..');
    cluster.fork();

    delete vlist[worker.process.pid];
  });

  cluster.on('exit', function(worker, code, signal) {
    'use strict';
    if (!vlist[worker.process.pid]) { return false; }

    var exitCode = worker.process.exitCode;
    console.log('\t[' + worker.process.pid +
                '] Worker died. (' + exitCode + ')');
    console.log('\tRespawning..');
    cluster.fork();

    delete vlist[worker.process.pid];
  });
}
