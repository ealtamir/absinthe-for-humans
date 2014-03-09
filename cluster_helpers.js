var cluster = require('cluster');
var helpers = require('./helpers');
var config  = require('./lib/config').config;

var init_cluster = function() {

  var _hr_mutate = helpers._hr_mutate;
  var init       = process.hrtime();
  var vlist      = {};
  var numCPUs    = config.doCluster?
    require('os').cpus().length : 1;

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
};

exports.init = function(worker) {
  if (!cluster.isMaster) {
    worker();
  } else {
    init_cluster();
  }
};
