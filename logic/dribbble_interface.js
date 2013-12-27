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
      per_page : 50
    }
  };

  var that = {
    getShots : function(type, callback) {
      typeof callback !== 'function' && process.exit(1);

      var obj       = _.clone(URL_OBJ),
          host_url  = '',
          req       = null,
          jsonData  = '';

      obj.pathname = 'shots';

      host_url = url.format(obj);

      if (cache[host_url] !== undefined) {
        return callback(cache[host_url]);
      }

      req = http.get(host_url);

      req.on('response', function(res) {
        res.on('data', function(data) {
          jsonData += data.toString();
        });
        res.on('error', function(err) {
          return callback(null, err);
        });
        res.on('end', function() {
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

exports.name = 'interface';
exports.Dribbble = Dribbble;
