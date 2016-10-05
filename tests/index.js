var gulp = require('gulp');
var changed = require('gulp-changed');
var concatStream = require('concat-stream');
var assert = require('assert');
var path = require('path');
var hasChangedDeps = require('../');
var mock = require('./util/mock');

var Paths = {
  ENTRY: __dirname + '/fixtures/entry.js',
  A: __dirname + '/fixtures/a.js',
  B: __dirname + '/fixtures/b.js',
  OUT: __dirname + '/fixtures/out/entry.js',
  OUT_DIR: __dirname + '/fixtures/out/'
};

var Dates = {
  NEWER: 2,
  UNTOUCHED: 0,
  TOUCHED: 1
};

var testCases = {
  entry: {
    mocks: {},
    expected: function(buf) {
      assert.equal(buf.length, 1);
      assert.equal(path.basename(buf[0].path), 'entry.js');
    }
  },
  deps: {
    mocks: {},
    expected: function(buf) {
      assert.equal(buf.length, 1);
      assert.equal(path.basename(buf[0].path), 'entry.js');
    }},
  none: {
    mocks: {},
    expected: function(buf) {
      assert.equal(buf.length, 0);
    }}
};

testCases.entry.mocks[Paths.ENTRY] = new Date(Dates.NEWER);
testCases.entry.mocks[Paths.A] = new Date(Dates.UNTOUCHED);
testCases.entry.mocks[Paths.B] = new Date(Dates.UNTOUCHED);
testCases.entry.mocks[Paths.OUT] = new Date(Dates.TOUCHED);

testCases.deps.mocks[Paths.ENTRY] = new Date(Dates.UNTOUCHED);
testCases.deps.mocks[Paths.A] = new Date(Dates.NEWER);
testCases.deps.mocks[Paths.B] = new Date(Dates.UNTOUCHED);
testCases.deps.mocks[Paths.OUT] = new Date(Dates.TOUCHED);

testCases.none.mocks[Paths.ENTRY] = new Date(Dates.UNTOUCHED);
testCases.none.mocks[Paths.A] = new Date(Dates.UNTOUCHED);
testCases.none.mocks[Paths.B] = new Date(Dates.UNTOUCHED);
testCases.none.mocks[Paths.OUT] = new Date(Dates.TOUCHED);

var tests = Object.keys(testCases);

// run tests!
(function next() {
  var test = testCases[tests.pop()];
  if (test) {
    var restore = mock.stat(test.mocks);
    gulp.src(Paths.ENTRY)
      .pipe(changed(Paths.OUT_DIR, {
        hasChanged: hasChangedDeps({
          allowMissingDeps: true,
          precinct: {
          }
        })
      }))
      .pipe(concatStream(function (buf) {
        test.expected(buf);
        restore();
        next();
      }));
  }else {
    console.log('Tests passed!');
  }
}());