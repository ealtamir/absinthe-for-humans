/* global http */
var _ = require('underscore');

var Dribbble = (function() {
  'use strict';

  var cache = {};

  var URL_OBJ = {
    protocol  : 'http',
    hostname  : 'api.dribbble.com',
    pathname  : '',
    query     : {
      per_page : 10
    }
  };

  var that = {
    getShots : function(type, callback) {
      typeof callback !== 'function' && process.exit(1);

      var obj       = _.clone(URL_OBJ),
          host_url  = '',
          req       = null,
          jsonData  = new Buffer(0);

      obj.pathname = 'shots';

      host_url = url.format(obj);

      if (cache[host_url] !== undefined) {
        return callback(cache[host_url].data);
      }

      req = http.get(host_url);

      req.on('response', function(res) {
        var totalBufSize = 0;

        res.on('data', function(data) {
          totalBufSize += data.length;
          jsonData = Buffer.concat([jsonData, data], totalBufSize);
        });
        res.on('error', function(err) {
          return callback(null, err);
        });
        res.on('end', function() {
          jsonData = JSON.parse(jsonData);
          cache[host_url] = {
            data      : jsonData,
            timestamp : new Date().getTime()
          };
          return callback(jsonData);
        });
      });
    },
  };

  return that;
}());

exports.name      = 'interface';
exports.Dribbble  = Dribbble;
