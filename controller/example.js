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

        チャレンジして失敗ことを恐れるよりも、何もしないことを恐れろ。
*/

exports.name = "example";
exports.paths = [
    "/start"
];

// tracking pixel ftw
var pixel = new Buffer("R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=", "base64");

exports.handler = function ( request, response, uri ) {
    if ( request.url == "/start" || request.url == "/start/" ) {
        // references the logic (/logic) named "util"(.js)
        return response.end(logic.util.HelloWorld());
    }

    // send pixel on /start/pixel
    if (request.url == "/start/pixel") {
        response.writeHead(200, {
            "Pragma": "no-cache",
            "Expires": "Mon, 2 Mar 1974 12:34:56 GMT",
            "Cache-Control": "no-cache, must-revalidate, no-store"
        });
        response.end(pixel);
    }

    return response.end();
};
