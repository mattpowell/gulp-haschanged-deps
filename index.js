var Fs = require('fs');
var Path = require('path');
var Walker = require('node-source-walk');
var Resolve = require('resolve');
var Gutil = require('gulp-util');
var Precinct = require('precinct');
var isDebug = false;

module.exports = function(opts) {
  opts = opts || {};

  var allowMissingDeps = opts.allowMissingDeps === true || opts.allowMissingDeps === undefined;

  return function hasChanged(stream, cb, sourceFile, targetPath) {

    var deps = getFlattenedDeps(sourceFile.path, opts.precinct);
    var sourceMtime = getLatestMtimeFromDeps(deps);

    isDebug && console.log('Got deps for `' + sourceFile.path + '`', deps, 'Latest mtime', sourceMtime);

    Fs.stat(targetPath, function(err, targetStat) {

      isDebug && console.log('Target', targetPath, 'mtime', targetStat && targetStat.mtime || err)

      if (err && !allowMissingDeps) {
        stream.emit('error', new Gutil.PluginError('gulp-haschanged-deps', err, {
          fileName: sourceFile.path
        }));
      }

      if (!targetStat || sourceMtime >= targetStat.mtime) {
        stream.push(sourceFile);
      }

      cb();

    });
  }
  
};

function toDeps(contents, path, precinctOpts) {
  return Precinct(contents, precinctOpts);
}

// TODO: remove me.
// function toDeps(contents, path) {

//   var deps = [];
//   var walker = new Walker();

//   try {
//     walker.walk(contents, function (node) {
//       if (node.type === 'ImportDeclaration' || (node.type === 'CallExpression' && node.callee.name === 'require')) { // TODO: support aliasing require?
//         walker.walk(node.source || node.arguments[0], function (child) {
//           if (child.type === 'Literal' && deps.indexOf(child.value) === -1) {
//             deps.push(child.value)
//           }
//         })
//       }
//     });
//   }catch(e) {
//     console.warn('[WARN] Caught error while processing path: %s', path);
//     throw e;
//   }
//   return deps;
// }

function toResolvedPath(basePath, path) {
  var resolvedPath;
  try {
    resolvedPath = Resolve.sync(Path.resolve(basePath, path)); // TODO: get off sync version
  }catch(e) { }
  return resolvedPath
}

function getFlattenedDeps(entryPoint, precinctOpts) {

  function recurse(path, allDeps, parent) {
    var basePath, contents, deps;

    allDeps = allDeps || [];
    allDeps.push(path);

    try {
      contents = Fs.readFileSync(path, 'utf8');
    }catch(e) {
      console.warn('[gulp-haschanged-deps][WARN] Encountered error while processing: %s', parent || '<entry point>', e);
      return allDeps;
    }
    
    basePath = Path.dirname(path);

    deps = toDeps(contents, path, precinctOpts).map(function(p) {
      var resolvedPath = toResolvedPath(basePath, p);
      if (!resolvedPath && p[0] === '.') { // only emit warning if it's a relative path
        console.warn('[gulp-haschanged-deps][WARN] Unable to resolve referenced path \'%s\' (from \'%s\')', p, path);
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

  return recurse(entryPoint);
}

function getLatestMtimeFromDeps(deps) {
  return deps.map(function(d) {
    var stat = Fs.statSync(d);
    return stat.mtime;
  }).reduce(function(cur, mtime) {
    return mtime > cur ? mtime : cur;
  }, 0);
}
