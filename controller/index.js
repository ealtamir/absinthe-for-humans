/* global logic */
/* global cancel */
/* global fs */
/* global _path */
/* global config */
/* global http */

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

        var dir       = _path.join(process.cwd(), config.img_path),
            files     = fs.readdirSync(dir);

        var callback = function(img_path) {
          return function(err, stream) {
            if (err) {
              console.log('Error pushing to server: ' + err);
              process.exit(1);
            }

            fs.createReadStream(img_path).pipe(stream);

            stream.on('error', function(err) {
              console.log('Error pushing data to client: ' + err);
              process.exit(1);
            });
          };
        };

        var download_imgs = (function() {
          var headers   = {
            'content-type'  : 'image/png',
            'link'          : ''
          };

          return function(shot) {
            var full_path = _path.join(dir, shot.id.toString() + '.png');
            var rel_path  = _path.join('/shots', shot.id.toString() + '.png');

            //headers.link = '<' + rel_path + '>; rel=subresource';

            if (files.indexOf(shot.id + '.png') === -1) {
              http.get(shot.image_url, function(res) {
                res.pipe(fs.createWriteStream(full_path));

                res.on('error', function(err) {
                  console.log('Error downloading imgs to server: ' + err);
                  fs.unlink(full_path);
                });

                res.on('end', function() {
                  console.log('File downloaded: ' + full_path);
                });
              });
            } else {
              shot.image_url = rel_path;
              response.push(rel_path, headers, callback(full_path));
            }
          };
        }());

        // Download data if it's not yet on the server.
        data.shots.forEach(download_imgs);


        return logic.template.compile('index', data,
          function(html, err) {
            if (err) {
              console.log('template.compile err: ' + err);
              return cancel(response);
            }
            return response.end(html);
          }
        );
      }
    );
  }
};

//function pushImgsToClient(response, data) {
//  'use strict';
//  var headers = {
//        'content-type'  : 'image/png',
//        //'link'          : ''
//      };
//
//  var callback = (function() {
//    var num = 0;
//
//    return function(err, stream) {
//      num += 1;
//      if (err) {
//        console.log('Error while trying to push to client.');
//        return;
//      }
//      stream.on('error', function(err) {
//        console.log(err);
//      });
//      stream.end('hello world!');
//    };
//  }());
//
//  data.shots.forEach(function(shot) {
//    //headers.link = '<' + shot.image_url + '>; rel=subresource';
//    response.push(shot.image_url, headers, callback);
//  });
//}
