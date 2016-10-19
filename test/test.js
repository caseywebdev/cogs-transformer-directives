var helper = require('cogs-test-helper');

helper.run({
  'test/config.json': {
    'test/foo.txt': helper.getFileBuffer('test/output.txt'),
    'test/error.txt': Error,
    'test/error2.txt': Error,
    'test/error3.txt': Error
  }
});
