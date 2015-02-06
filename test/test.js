var config = require('cogs/src/config');
var crypto = require('crypto');
var expect = require('chai').expect;
var fs = require('fs');
var getBuild = require('cogs/src/get-build');
var glob = require('glob');
var path = require('path');

var beforeEach = global.beforeEach;
var describe = global.describe;
var it = global.it;

var getHash = function (buffer) {
  var hash = crypto.createHash('md5');
  hash.end(buffer);
  return hash.read().toString('hex');
};

var getFileHash = function (filePath) {
  return getHash(fs.readFileSync(filePath));
};

var getGlobHash = function (pattern) {
  return getHash(JSON.stringify(glob.sync(pattern)));
};

var FIXTURES = {
  'test/config.json': {
    'test/foo.txt': {
      path: 'test/foo.txt',
      buffer: fs.readFileSync('test/output.txt'),
      hash: getFileHash('test/output.txt'),
      requires: [{
        path: 'test/foo.txt',
        hash: getFileHash('test/foo.txt')
      }, {
        path: 'test/bar.txt',
        hash: getFileHash('test/bar.txt')
      }, {
        path: 'test/baz.txt',
        hash: getFileHash('test/baz.txt')
      }],
      links: [{
        path: 'test/buz.txt',
        hash: getFileHash('test/buz.txt')
      }],
      globs: [{
        path: 'test/+(bar|baz).txt',
        hash: getGlobHash('test/+(bar|baz).txt')
      }]
    },
    'test/error.txt': Error,
    'test/error2.txt': Error,
    'test/error3.txt': Error
  }
};

Object.keys(FIXTURES).forEach(function (configPath) {
  var builds = FIXTURES[configPath];

  describe(configPath, function () {
    beforeEach(function () {
      config.set(require(path.resolve(configPath)));
    });

    Object.keys(builds).forEach(function (inputPath) {
      var expected = builds[inputPath];

      describe(inputPath, function () {
        var expectsError = expected === Error;

        it(expectsError ? 'fails' : 'succeeds', function (done) {
          getBuild(inputPath, function (er, build) {
            if (expectsError) expect(er).to.be.an.instanceOf(Error);
            else expect(build).to.deep.equal(expected);
            done();
          });
        });
      });
    });
  });
});
