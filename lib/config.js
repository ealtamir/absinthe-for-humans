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


//var fs = require("fs");
exports.config = {
  port           : 80,
  IP             : '0.0.0.0',
  blacklist      : [],
  debug          : true,
  img_path       : 'static/shots',
  path404        : 'lib/error/404.html',
  default_port   : '8080',
  http_default_p : '8081',
  serve_index    : true,

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
  doCluster      : false,

  version: function() {
    return 1;
  }
};
