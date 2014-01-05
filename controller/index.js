/* global logic */
/* global cancel */

exports.name = 'index';
exports.paths = [
    '/'
];

exports.handler = function(req, response, uri) {
  'use strict';

  if (uri === '/' || uri === '') {
    logic.dribbble_interface.Dribbble.getShots('popular',
      function(data, err) {
        if (err) {
          console.log('Dribbble.getShots err: ' + err);
          return process.exit(1);
        }

        setTimeout(function() {
          return logic.template.compile('index', data,
            function(html, err) {
              if (err) {
                console.log('template.compile err: ' + err);
                return cancel(response);
              }
              return response.end(html);
            }
          );
        }, 500);

      }
    );
  }
};
