
var _hr_mutate = function(init) {
  'use strict';
  init = process.hrtime(init); // [seconds, nanoseconds]

  // Seconds
  var mili  = init[1] / 1E6;
  var micro = (init[1] / 1E3) - (~~mili * 1E3);
  var nano  = micro % 1 * 1E3; // XXX % 1 always returns 0.

  // For ~~ information refer to:
  // http://james.padolsey.com/javascript/double-bitwise-not/
  return init[0] + 's ' + ~~mili + 'ms' +
      ' ' + ~~micro + 'µs' + ' ' + ~~nano + 'ns';
};


exports._hr_mutate = _hr_mutate;
