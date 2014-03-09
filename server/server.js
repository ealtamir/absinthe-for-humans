var MemCache = require('../server/custom_memcache').MemCache;
var helpers  = require('../helpers');
var cancel   = helpers.cancel;

var addInfo = function(ctype, stash, dict, path, stat) {
  if (ctype === 1) {
    dict.push(path);
  } else if (ctype === 2) {
    stash[path] = stat;
  }
};

var processDirEntries = function(ctype, start, processed, stash, found, total, callback) {
  return function(file, i, dir) {
    var abspath = _path.join(start, file);
    var stat = fs.statSync(abspath);

    if (stat === void(0)) {
      return callback(null);
    }

    if (!stat.isDirectory()) {
      addInfo(ctype, stash, found.files, abspath, stat);

      processed += 1;
      if (processed === dir.length) {
        callback(null, found, stash);
      }
    } else {
      addInfo(ctype, stash, found.dirs, abspath, stat);

      readDir(abspath, function(err, data) {
        if (ctype === 1) {
          found.dir   = found.dirs.concat(data.dirs);
          found.files = found.files.concat(data.files);
        }

        processed += 1;
        if (processed === total) {
          callback(null, found, stash);
        }
      });
    }
  };
};

var readDir = function(start, ctype, callback) {
  var found = {
    dirs  : [],
    files : []
  };

  var processed   = 0;
  var dirContents = null;
  var stash       = {};
  var stat        = null;
  var total       = 0;

  if (ctype instanceof Function) {
    callback = ctype;
    ctype = 1;
  }

  // Adds info to stash or found obj depending on
  // the ctype that was chosen.
  stat = fs.lstatSync(start);
  if (stat === void(0)) {
    callback(null);
  } else if (!stat.isDirectory()) {
    return false;
  }

  dirContents = fs.readdirSync(start);

  if (dirContents.length === 0) {
    return callback(null, found, total);
  }

  dirContents.forEach(
    processDirEntries(ctype, start, processed, stash, found, total, addInfo, callback)
  );
};

// SECURITY: Cancel request if it tries to access dirs
// outside the project dir.
var doSecurityCheck = function(staticFileName, uri) {
  if ( /\.\.\/\.\./.test(uri) || /\.\/\.\./.test(uri) ) {
    return false;
  }
  if ( staticFileName.length < (process.cwd()).length ) {
    return false;
  }
  if ( ~uri.indexOf('/../') ) {
    return false;
  }
  return true;
};

var delegateToController = function(uri, controller, request, response) {
  var temp = null;
  for (var router in controller) {
    for (var route in controller[router].paths) {
      temp = controller[router].paths[route]; // path name
      if (uri === temp) {
        return controller[router].handler.apply(this, [
          request,
          response,
          controller[router].paths[route],
          uri
        ]);
      }
    }
  }

  return false;
};

// BLACKLIST
var checkBlacklist = function(uri, response) {
  var rpaths = config.blacklist;
  for (var rpath in rpaths) {
    if (uri.substr(0, rpaths[rpath].length) === rpaths[rpath]) {
      response.writeHead(418, {
        'Content-Type': 'text/plain'
      });
      return response.end('418 I\'m a teapot\n');
    }
  }
  return false;
};

var processReadDirs = function(fileStatsLog) {
  var filesLog          = {};
  var _fs_cache_deflate = {};
  var _fs_cache_gzip    = {};
  var ucache            = {};

  var requestHandler = function(request, response) {
    var parsed  = url.parse(request.url);
    var uri     = parsed.pathname;
    var temp    = null;

    sanitize(uri, ucache, function(uri, staticFileName, forceDelegation) {
      response._writeHead = response.writeHead;

      response.writeHead = function (statusCode, headers) {
        headers = headers || {};

        headers.libAbsinthe = 'r' + config.version;

        return response._writeHead.apply(this, [statusCode, headers]);
      };

      if (forceDelegation) {
        response.writeHead(307, {
            'Location': uri
        });
        return response.end();
      }

      if (doSecurityCheck(staticFileName, uri) !== true) {
        return cancel(response);
      }

      // ROUTER
      temp = delegateToController(uri, controller, request, response);
      if (temp !== false) {
        return temp
      }

      // Check Blacklist
      temp = checkBlacklist(uri, response);
      if (temp !== false) {
        return temp
      }

      if (filesLog[staticFileName] === void(0)) {
        filesLog[staticFileName] = fs.existsSync(staticFileName);
      }

      if (!filesLog[staticFileName]) {
        return cancel(response);
      }

      return serveFromCacheOrCrompress(request, response, staticFileName, fileStatsLog);
    });
  };

  startServers(requestHandler);

  console.log('[' + process.pid + '] Ready.');
};

var startServers = function(callback) {
  spdy.createServer({
      ca: fs.readFileSync('./lib/tls/server.csr'),
      key: fs.readFileSync('./lib/tls/server.key'),
      cert: fs.readFileSync('./lib/tls/server.crt'),
    },
    callback
  ).listen(config.default_port);

  http.createServer(function (request, response) {
    if (!request.headers.host) {
      response.end();
    }

    return response.writeHead(302, {
            'Location': 'https://sly.mn' + request.url
    }), response.end();
  }).listen(config.http_default_p);
};

var serveFromCacheOrCrompress = function(request, response, staticFileName, fileStatsLog) {
  var s    = fs.createReadStream(staticFileName);
  var etag = fileStatsLog['static' + uri] && fileStatsLog['static' + uri].mtime || '0';
  var ntag = +etag;

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

  var aE = request.headers['accept-encoding'] || '';
  var _resHead  = {
    'Content-Type': mime.lookup(staticFileName),
    'Cache-control': 'max-age=604800',
    'Expire': new Date().toString(),
    'Etag': ntag
  };

  var compress = function(name, obj, cache) {
    _resHead['Content-Encoding'] = name;
    response.writeHead(200, _resHead);

    if (cache[staticFileName]) {
      return cache[staticFileName].pipe(response);
    }

    cache[staticFileName] = new MemCache();
    s.pipe(obj).pipe(cache[staticFileName]);
    return cache[staticFileName].pipe(response);
  };

  if (~aE.indexOf('deflate')) {
    return compress('deflate', zlib.createDeflate(), _fs_cache_deflate);
  } else if (~aE.indexOf('gzip')) {
    return compress('gzip', zlib.createGzip(), _fs_cache_gzip);
  } else {
    response.writeHead(200, _resHead);
    return s.pipe(response);
  }
};


// Checks if path exists and decides which file to serve.
var sanitize = function (uri, ucache, callback) {
  if (ucache[uri]) {
    return callback.apply(this, ucache[uri]);
  }

  var resvd = _path.join(process.cwd(), '/static', uri);
  var stat  = fs.statSync(resvd);

  if (stat === void(0)) {
    console.log('Couldn\'t read directory in sanitize function');
    return callback(uri, resvd);
  }

  var isDirectory = stat.isDirectory();

  // when path is '/' serves index.html
  var forceDelegation = uri.substr(-1) !== '/';

  if (isDirectory) {
    if (forceDelegation) {
      uri += '/';
    } else {
      uri += config.serve_index ? 'index.html': '';
    }
  }

  ucache[uri] = [
    uri,
    _path.join(process.cwd(), '/static', uri),
    isDirectory && forceDelegation
  ];

  return callback.apply(this, ucache[uri]);
};

/*
    PRIMARY

        ctype &
                001 - Array [& ]
                010 - Object-Stat Hashmap
*/
var readDictionary = function(start, ctype, readDir, callback) {
  // Callback gets status, files found and number of files.
  return readDir(start, ctype, function(a, b, c) {
    if (!(ctype ^ 3)) {
      return callback(b, c);
    }
    if (ctype & 1) {
      return callback(b);
    }
    if (ctype & 2) {
      return callback(c);
    }
  });
};

exports.start = function() {
  var startDir = './static';
  var ctype    = 2;

  readDictionary('./static', 2, readDir, processReadDirs);
};
