import helper from 'cogs-test-helper';

export default helper.createTests({
  'test/config.js': {
    'test/foo.txt': 'test/output.txt',
    'test/error.txt': Error,
    'test/error2.txt': Error,
    'test/error3.txt': Error
  }
});
