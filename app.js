#!/usr/local/bin/node

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

GLOBAL.doCluster = false;

// Node won't display your
// controllers if you're
// clustering Absinthe.
//
GLOBAL.SERVE_INDEX = false;

var helpers = require("./helpers");
var _hr_mutate = helpers._hr_mutate;

var cluster = require('cluster');
var numCPUs = doCluster ? require('os').cpus().length : 1;

var worker = function() {
  // General purpose variable.
  var temp  = null;
  var _c_   = null;
  var _c    = null;

  // Used to substitute normal require if using V8
  var _require = null;

  // Constants
  var ABSINTHE = {
    version: function() {
      return '1';
    }
  };
  var DEFAULT_PORT    = 8080;
  var HTTP_DEFAULT_P  = 8081;

  // Loads many variables to the global environment
  require('./server_init').server_init();

  var port = config.port;

  _stream = require('stream').Stream;

  // Custom stream implementations
  var MemCache = require('./custom_memcache').MemCache(_stream);

  /*
      PRIMARY

          ctype &
                  001 - Array [& ]
                  010 - Object-Stat Hashmap
  */

  // TODO: Find out what is ctype.
  var readDictionary = function(start, ctype, callback) {
    var readDir = null;
    var stash   = {};

    if (ctype instanceof Function) {
      callback = ctype;
      ctype = 1;
    }

    // Callback gets status, files found and number of files.
    readDir = function(start, callback) {
      fs.lstat(start, function(err, stat) {
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
    };

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
        if (err) {
          console.log('Error inside sanitize function.');
          console.dir(err);
          return callback(uri, resvd);
        }

        var isDirectory     = stat.isDirectory(),
            // when path is '/' serves index.html
            forceDelegation = uri.substr(-1) !== '/';

        // TODO: If path is a directory, what do you serve?
        if (isDirectory) {
          if (forceDelegation) {
            uri += '/';
          } else {
            uri += SERVE_INDEX ? 'index.html': '';
          }
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
        cert: fs.readFileSync('./lib/tls/server.crt'),

        maxStreams: 100
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

        var compress = function(name, obj, cache) {
          _resHead['Content-Encoding'] = name;
          response.writeHead(200, _resHead);

          if (cache[fn_]) {
            return cache[fn_].pipe(response);
          }

          cache[fn_] = new MemCache();
          s.pipe(obj).pipe(cache[fn_]);
          return cache[fn_].pipe(response);
        };

        if (~aE.indexOf('deflate')) {
          return compress('deflate', zlib.createDeflate(), _fs_cache_deflate);

        } else if (~aE.indexOf('gzip')) {
          return compress('gzip', zlib.createGzip(), _fs_cache_gzip);

        } else {
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
