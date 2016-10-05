var fs = require('fs');

// TODO: use real mocking library!!!!
module.exports = {
  stat: function(mocks) {
    var oldStat = fs.stat;
    var oldStatSync = fs.statSync;

    fs.statSync = function(path) {
      var stat = oldStatSync.apply(this, arguments);
      if (mocks[path]) {
        stat.mtime = mocks[path];
      }
      return stat;
    };

    fs.stat = function(path, callback) {
      oldStat.call(this, path, function(err, stat) {
        if (mocks[path] && stat) {
          stat.mtime = mocks[path];
        }
        return callback.apply(this, arguments);
      });
    };

    // return a function to "restore" overwritten methods
    return function() {
      fs.statSync = oldStatSync;
      fs.stat = oldStat;
    };
  }
}