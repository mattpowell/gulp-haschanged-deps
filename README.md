# gulp-haschanged-deps
> Comparator function for `gulp-changed` to determine if any of the dependencies for a js module (amd, commonjs, or es6), sass, or stylus file has changed.

Example
-------
```js
var gulp = require('gulp');
var changed = require('gulp-changed');
var hasChangedDeps = require('gulp-haschanged-deps');

gulp.task('copy', function() {
  return gulp.src('public/lib/**/*')
    .pipe(changed('build/public/lib', {
      hasChanged: hasChangedDeps({
        allowMissingDeps: true
      })
    }))
    .pipe(gulp.dest('build/public/lib'));
});
```

The above example will only copy over files in `public/lib` if the file or any of it's dependencies are newer than the associated file in `build/public/lib`.

Options
-------
* Setting `allowMissingDeps` to `true` (the default) will skip missing dependencies, however, if it's set to `false` and a dependency cannot be found, an error will be thrown.
* Setting `precinct` as an `Object` will be passed through to the [Precinct](https://github.com/dependents/node-precinct) library (which is what is doing all the heavy lifting behind the scenes). This can be helpful for setting a specific type of parser for finding dependencies. E.g. `{ precinct: { type: 'commonjs' } }`.

License
-------
MIT
