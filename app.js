#!/usr/local/bin/node

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

        Permission is hereby granted, free of charge, to any person obtaining
        a copy of this software and associated documentation files
        (the "Software"), to deal in the Software without restriction,
        including without limitation the rights to use, copy, modify, merge,
        publish, distribute, sublicense and to permit persons to whom the
        Software is furnished to do so, subject to the following conditions:

        The above copyright notice and this permission notice shall
        be included in all copies, substantial portions or derivates of the
        Software.

        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
        NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
        BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
        ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
        CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
        SOFTWARE.
*/

global._stream  = require('stream').Stream;

global.controller = {};
global.logic      = {};

var helpers    = require('./helpers');
var _hr_mutate = helpers._hr_mutate;

var cluster_helpers = require('./server/cluster_helpers');
var config          = require('./lib/config').config;

var worker = function() {

  var server = require('./server/server');
  var init   = require('./server/server_init');

  init.importGlobalModules(require); // Call this first
  init.checkIfV8(global.v8);
  init.loadControllersAndLogics(controller, logic);
  init.changeFSReadStream();

  // Custom stream implementations
  server.start();
};

cluster_helpers.init(worker);
