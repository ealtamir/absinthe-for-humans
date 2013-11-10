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
 
        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense and to permit
        persons to whom the Software is furnished to do so, subject to the following
        conditions:
 
        The above copyright notice and this permission notice shall be included in
        all copies, substantial portions or derivates of the Software.
 
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
        OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
        THE SOFTWARE.
*/

var _hr_mutate = function ( init ) {
        init = process.hrtime(init);

        ms = init[1] / 1E6;
        mys = (init[1] / 1E3) - ( ~~ms * 1E3 );
        ns = mys % 1 * 1E3

        return init[0] + "s " + ~~ms + "ms" + " " + ~~mys + "µs" + " " + ~~ns + "ns";
}

cluster = require("cluster");
numCPUs = doCluster ? require('os').cpus().length : 1;

var worker = function () {
        // Don't var. They are exposed to the controllers.

        childProcess = require("child_process"),
        crypto = require("crypto"),
        fs = require("fs"),
        http = require("http"),
        https = require("https"),
        mime = require("mime"),
        path = require("path"),
        url = require("url"),
        util = require("util"),
        repl = require("repl"),
        zlib = require("zlib");

        try {delete e;e;}catch(e){v8=e.stack!=void 0}finally{v8=v8||0}

        "use strict";

        // Refer to https://gist.github.com/KenanSulayman/5281658.
        var _$ = require;

        require = function(k) {
                try {
                        return _$(k);
                } catch (e) {
                        if (v8) {
                                (_ = e.stack.split("\n"), __ = "");
                                for (var a in _) null != _[a].match(/\(([^)]+)\)/g) && (__ += Array(+a + 1).join(" ") + "=> " + _[a].match(/\(([^)]+)\)/g) + "\n");
                                console.log(_[0], "[" + k + "]\n", __), process.exit();
                        } else {
                                console.trace("=== FATAL ERROR: \"" + k + "\" ==="), process.exit();
                        }
                }
        }

        // Constants
                const Absinthe = {
                        get version () {
                                return "1";
                        }
                }

        // Configuration
                config = require("./lib/config").config;

        // Extensions
                // Load router modules
                        controller = {};
                        require("fs").readdirSync("./controller").forEach(function(file) {
                                (file.split(".")[1] === "js") &&
                                        (controller[file.split(".")[0]] // basename
                                                = require("./controller/" + file))
                        });

                        if ( !doCluster ) {
                                var _c_ = [];
                                for ( var _c in controller ) _c_.push("'" + controller[_c].name + "'[.js] => " + (controller[_c].paths.length > 0 ? controller[_c].paths.join(", ") : "<virtual>") + "")
                                _c_.length && console.log("Initialized Routers:\n\t" + _c_.join("\n\t") + "\n")
                        }

                // Load logical modules
                        logic = {};
                        require("fs").readdirSync("./logic").forEach(function(file) {
                                (file.split(".")[1] === "js") &&
                                        (logic[file.split(".")[0]] // basename
                                                = require("./logic/" + file))
                        });

                        if ( !doCluster ) {
                                _c_ = [];
                                for ( var _c in logic ) _c_.push("'" + logic[_c].name + "'");
                                _c_.length && console.log("Initialized Logics:\n\t" + _c_.join("\n\t") + "\n")
                        }

        var port = parseInt(process.argv[2] || 80);
 
        _str = require("stream").Stream;

        var MemCache = function () {
                _str.call(this);
                this.readable = this.writable = !0;
                this._buffers = [];
                this._dests = []; this._ended = !1
        };

        require("util").inherits(MemCache, _str);

        MemCache.prototype.write = function (a) {
                this._buffers.push(a);
                this._dests.forEach(function (b) { b.write(a) })
        };

        MemCache.prototype.pipe = function (a, b) {
                if (b) return false;
                this._buffers.forEach(function (b) { a.write(b) });
                if (this._ended) return a.end(), a;
                this._dests.push(a);
                return a
        };

        MemCache.prototype.getLength = function () {
                return this._buffers.reduce(function (a, b) { return a + b.length }, 0)
        };

        MemCache.prototype.end = function () {
                this._dests.forEach(function (a) { a.end() });
                this._ended = !0; this._dests = []
        };

        /*
            PRIMARY
         
                ctype &
                        001 - Array [& ]
                        010 - Object-Stat Hashmap
        */
         
        var readDictionary = function (start, ctype, callback) {
                var readDir, stash = {};

                ctype instanceof Function && ( callback = ctype, ctype = 1 );

                return (readDir = function(start, callback) {
                        fs.lstat(start, function(err, stat) {
                                if (err) return callback(err);

                                var found = { dirs: [], files: [] },
                                        total = 0, processed = 0;

                                if (stat.isDirectory()) {
                                        fs.readdir(start, function(err, files) {
                                                total = files.length;

                                                if (!total)
                                                        return callback(null, found, total);

                                                files.forEach(function (a) {
                                                        var abspath = path.join(start, a);

                                                        fs.stat(abspath, function(err, stat) {
                                                                if (stat.isDirectory()) {
                                                                        ctype & 1 && found.dirs.push(abspath);
                                                                        ctype & 2 && (stash[abspath] = stat);
                                                                        readDir(abspath, function(err, data) {
                                                                                if ( ctype & 1 ) {
                                                                                        found.dirs = found.dirs.concat(data.dirs);
                                                                                        found.files = found.files.concat(data.files);
                                                                                }
                                                                                (++processed == total) && callback(null, found, stash);
                                                                        });
                                                                } else {
                                                                        ctype & 1 && found.files.push(abspath);
                                                                        ctype & 2 && (stash[abspath] = stat);
                                                                        (++processed == total) && callback(null, found, stash);
                                                                }
                                                        });
                                                })
                                        });
                                } else {
                                        return false;
                                }
                        });
                })(start, function (a, b, c) {
                        if ( !(ctype ^ 3) )
                                return callback(b, c);

                        if ( ctype & 1 )
                                return callback(b);

                        if ( ctype & 2 )
                                return callback(c);
                })
        };

        readDictionary("./static", 2, function (_fm) {
                var _fs = {},
                _fs_cache = {},
                _fs_cache_deflate = {},
                _fs_cache_gzip = {};

                fs._createReadStream = fs.createReadStream;

                fs.createReadStream = function (a, b) {
                        void 0 == b && (b = {})

                        // whereas a is fd_ref && b is typeof object
                        // __ if a, b do not statisfy (String a, Object b) forward to base implementation
                        if ( !(typeof a == "string" ) || !(typeof b == "object"))
                                return fs._createReadStream.apply(this, arguments);

                        if ( _fs_cache[a] ) return _fs_cache[a];

                        _fs_cache[a] = new MemCache();
                        fs._createReadStream(a, b).pipe(_fs_cache[a]);
                        return _fs_cache[a];            
                }


                var err = path.join(__dirname, "lib/error/404.html");

                var cancel = function ( response ) {
                        return response.writeHead(404, {
                                "Content-Type": "text/html"
                        }), fs.createReadStream(err).pipe(response);
                }

                var ucache = {};
                var sanitize = function (uri, cb) {
                        if ( ucache[uri] )
                                return cb.apply(this, ucache[uri])

                        var resvd = path.join(process.cwd(), "/static", uri);

                        fs.stat(resvd, function (err, stat) {
                                if (err) return cb(uri, resvd);

                                var isDirectory = stat.isDirectory(),
                                forceDelegation = uri.substr(-1) !== "/";

                                isDirectory && ( !forceDelegation ? (uri += "index.html") : (uri += "/") );

                                ucache[uri] = [
                                        uri,
                                        path.join(process.cwd(), "/static", uri),
                                        isDirectory && forceDelegation
                                ];

                                return cb.apply(this, ucache[uri]);
                        })
                }

                spdy.createServer({
                        ca: fs.readFileSync("./lib/tls/ca"),
                        key: fs.readFileSync("./lib/tls/key"),
                        cert: fs.readFileSync("./lib/tls/cert")
                }, function (request, response) {
                        var uri = url.parse(request.url).pathname;

                        sanitize(uri, function (uri, fn_, forceDelegation) {
                                response._writeHead = response.writeHead;
                                response.writeHead = function (a, b) {
                                        b = b || {};

                                        b["libAbsinthe"] = "r" + Absinthe.version;

                                        return response._writeHead.apply(this, [a, b]);
                                }

                                if ( forceDelegation )
                                        return response.writeHead(307, {
                                                "Location": uri
                                        }), response.end();

                                // SECURITY
                                        if ( /\.\.\/\.\./.test(uri) || /\.\/\.\./.test(uri) ) 
                                                return cancel(response);
                                        
                                        if ( fn_.length < (process.cwd()).length )
                                                return cancel(response);
                                        
                                        if ( ~uri.indexOf("/../") )
                                                return cancel(response);

                                // ROUTER
                                        for ( var router in controller )
                                                for ( route in controller[router].paths ) {
                                                        if ( (uri.substr(0, controller[router].paths[route].length) === controller[router].paths[route] && (uri.substr(controller[router].paths[route].length, 1) == "/"))
                                                                        || ( uri === controller[router].paths[route] ) )
                                                                return controller[router].handler.apply(this, [
                                                                        request,
                                                                        response,
                                                                        controller[router].paths[route],
                                                                        uri
                                                                ]);
                                                }

                                // BLACKLIST
                                        rpaths = config.blacklist;

                                        for ( var rpath in rpaths )
                                                if ( uri.substr(0, rpaths[rpath].length) === rpaths[rpath] )
                                                        return response.writeHead(418, {
                                                                "Content-Type": "text/plain"
                                                        }), response.end("418 I'm a teapot\n");

                                if ( _fs[fn_] == void 0 ) {
                                        _fs[fn_] = fs.existsSync(fn_)
                                }
                                
                                if ( !_fs[fn_] )
                                        return cancel(response);

                                var s = fs.createReadStream(fn_),
                                        etag = _fm["static"+uri] && _fm["static"+uri].mtime || "0"
                                        ntag = +etag;

                                if ( request.headers["if-none-match"] == ntag )
                                        return response.end(response.writeHead(304, {
                                                "Date": etag.toString(),
                                                "Etag": ntag,
                                                "Cache-Control": "max-age=86400, public",
                                                "Content-type": "image/jpeg",
                                                "Keep-Alive": "timeout=6, max=32",
                                                "Connection": "keep-alive"
                                        }));

                                var aE = request.headers['accept-encoding'] || "",
                                        _resHead = {
                                        "Content-Type": mime.lookup(fn_),
                                        "Cache-control": "max-age=604800",
                                        "Expire": new Date().toString(),
                                        "Etag": ntag
                                };

                                if (~aE.indexOf("deflate")) {
                                        _resHead['Content-Encoding'] = 'deflate';
                                        response.writeHead(200, _resHead);

                                        if ( _fs_cache_deflate[fn_] ) return _fs_cache_deflate[fn_].pipe(response);

                                        _fs_cache_deflate[fn_] = new MemCache();
                                        s.pipe(zlib.createDeflate()).pipe(_fs_cache_deflate[fn_]);
                                        return _fs_cache_deflate[fn_].pipe(response);
                                }

                                if (~aE.indexOf("gzip")) {
                                        _resHead['Content-Encoding'] = 'gzip';
                                        response.writeHead(200, _resHead);

                                        if ( _fs_cache_gzip[fn_] ) return _fs_cache_gzip[fn_].pipe(response);

                                        _fs_cache_gzip[fn_] = new MemCache();
                                        s.pipe(zlib.createGzip()).pipe(_fs_cache_gzip[fn_]);
                                        return _fs_cache_gzip[fn_].pipe(response);
                                }
                                
                                response.writeHead(200, _resHead);

                                return s.pipe(response);
                        });
                }).listen(443, "87.106.69.16");

                http.createServer(function (request, response) {
                        if ( !request.headers.host ) response.end();
                        
                        return response.writeHead(302, {
                                'Location': 'https://sly.mn' + request.url
                        }), response.end();
                }).listen(80, "87.106.69.16");

                console.log("[" + process.pid + "] Ready.");
        });
}

if (cluster.isMaster) {       
        var init = process.hrtime(), vlist = {};

        console.log("Spawning..");

        for (var i = 0; i < numCPUs; i++) {
                cluster.fork();
        }

        cluster.on('online', function(worker) {
                console.log("\t[" + worker.process.pid + "] Worker online. [" + _hr_mutate(init) + "]");

                vlist[worker.process.pid] = true;
        });

        cluster.on('disconnect', function(worker) {
                if ( !vlist[worker.process.pid] ) return false;

                console.log("\t[" + worker.process.pid + "] Worker disconnected.");
                console.log("\tRespawning..");
                cluster.fork();

                delete vlist[worker.process.pid];
        });

        cluster.on('exit', function(worker, code, signal) {
                if ( !vlist[worker.process.pid] ) return false;

                var exitCode = worker.process.exitCode;
                console.log("\t[" + worker.process.pid + "] Worker died. (" + exitCode + ")");
                console.log("\tRespawning..");
                cluster.fork();

                delete vlist[worker.process.pid];
        });
} else {
        worker();
}