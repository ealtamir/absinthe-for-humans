exports.MemCache = function(stream) {

  var obj = function () {
    _stream.call(this);

    this.readable = true;
    this.writable = true;

    this._buffers = [];
    this._dests = [];       // destinations
    this._ended = false;

    this.setMaxListeners(0);
  };

  obj.prototype.write = function(data) {
    this._buffers.push(data);
    this._dests.forEach(function(dest) {
      dest.write(data);
    });
  };

  obj.prototype.pipe = function(writable, options) {
    if (options) {
      return false;
    }
    this._buffers.forEach(function(data) {
      writable.write(data);
    });
    if (this._ended) {
      return writable.end(), writable; // TODO: Answer what does this do?
    }
    this.emit('fin', writable);

    this._dests.push(writable);
    return writable;
  };

  obj.prototype.getLength = function () {
    return this._buffers.reduce(function (preVal, curVal) {
      return preVal + curVal.length;
    }, 0);
  };

  obj.prototype.end = function () {
    this._dests.forEach(function(dest) { dest.end(); });
    this._ended = true;
    this._dests = [];
  };

  require('util').inherits(obj, stream);

  return obj;
};
