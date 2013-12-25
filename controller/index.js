/* global logic */

exports.name = 'index';
exports.paths = [
    '/'
];

exports.handler = function(req, res, uri) {
  'use strict';

  if (uri === '/' || uri === '') {
    logic.template.compile('index', res, {});
  }
};
