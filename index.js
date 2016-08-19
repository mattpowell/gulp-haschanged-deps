
var Fs = require('fs');
var Path = require('path');
var Walker = require('node-source-walk');
var Resolve = require('resolve');
var Gutil = require('gulp-util');

module.exports = hasChanged;

function toDeps(contents, path) {
  var deps = [];
  var walker = new Walker();

  try {
    walker.walk(contents, function (node) {
      if (node.type === 'ImportDeclaration' || (node.type === 'CallExpression' && node.callee.name === 'require')) { // TODO: support aliasing require?
        walker.walk(node.source || node.arguments[0], function (child) {
          if (child.type === 'Literal' && deps.indexOf(child.value) === -1) {
            deps.push(child.value)
          }
        })
      }
    });
  }catch(e) {
    console.warn('[WARN] Caught error while processing path: %s', path);
    throw e;
  }
  return deps;
}

var entryToDepsCache = {}; // TODO: decide if we keep this!
function getFlattenedDeps(entryPoint) {
  function recurse(path, allDeps, parent) {
    var basePath, contents, deps;

    allDeps = allDeps || [];
    allDeps.push(path);

    try {
      contents = Fs.readFileSync(path);
    }catch(e) {
      console.warn('[WARN] Encountered error while processing: %s', parent || '<entry point>', e);
      return allDeps;
    }
    
    basePath = Path.dirname(path);

    deps = toDeps(contents.toString(), path).map(function(p) {
      var resolvedPath;
      try {
        resolvedPath = Resolve.sync(Path.resolve(basePath, p));
      }catch(e) {
        // TODO: throw warning... also get off sync version of resolve
        if (p[0] === '.') { // only emit warning if it's a relative path
          console.warn('[WARN] Unable to resolve referenced path \'%s\' (from \'%s\')', p, path);
        }
      }
      return resolvedPath
    });

    deps.forEach(function(d) {
      if (d && allDeps.indexOf(d) === -1) {
        recurse(d, allDeps, path);
      }
    });

    return allDeps;
  }

  // TODO: decide if we keep this!
  var flattenedDeps = entryToDepsCache[entryPoint];
  if (!flattenedDeps) {
    flattenedDeps = recurse(entryPoint);
    setTimeout(function() {
      delete entryToDepsCache[entryPoint];
    }, 1);
  }
  return flattenedDeps;
}

function getLatestMtimeFromDeps(deps) {
  return deps.map(function(d) {
    var stat = Fs.statSync(d);
    return stat.mtime;
  }).reduce(function(cur, mtime) {
    return mtime > cur ? mtime : cur;
  }, 0);
}

function hasChanged(stream, cb, sourceFile, targetPath) {
  var deps = getFlattenedDeps(sourceFile.path);
  var sourceMtime = getLatestMtimeFromDeps(deps);
  Fs.stat(targetPath, function(err, targetStat) {
    if (err && false) {
      stream.emit('error', new Gutil.PluginError('gulp-haschanged-deps', err, {
        fileName: sourceFile.path
      }));
    }
    if (!targetStat || sourceMtime > targetStat.mtime) {
      stream.push(sourceFile);
    }
    cb();
  });
}