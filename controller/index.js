
exports.name = 'index';
exports.paths = [
    '/'
];

exports.handler = function(req, res, uri) {
    'use strict';

    if (req.url === '/' || req.url === '') {
        return res.end('Yoooo');
    }
};
