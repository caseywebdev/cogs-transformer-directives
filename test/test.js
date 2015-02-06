var helper = require('cogs-test-helper');

helper.run({
  'test/config.json': {
    'test/foo.txt': {
      path: 'test/foo.txt',
      buffer: helper.getFileBuffer('test/output.txt'),
      hash: helper.getFileHash('test/output.txt'),
      requires: [{
        path: 'test/foo.txt',
        hash: helper.getFileHash('test/foo.txt')
      }, {
        path: 'test/bar.txt',
        hash: helper.getFileHash('test/bar.txt')
      }, {
        path: 'test/baz.txt',
        hash: helper.getFileHash('test/baz.txt')
      }],
      links: [{
        path: 'test/buz.txt',
        hash: helper.getFileHash('test/buz.txt')
      }],
      globs: [{
        path: 'test/+(bar|baz).txt',
        hash: helper.getGlobHash('test/+(bar|baz).txt')
      }]
    },
    'test/error.txt': Error,
    'test/error2.txt': Error,
    'test/error3.txt': Error
  }
});
