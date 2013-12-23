
exports.name = 'index';
exports.paths = [
    '/'
];

exports.handler = function(req, res, uri) {
    'use strict';

    if (uri === '/' || uri === '') {
        return res.end('Yoooo');
    }
};
