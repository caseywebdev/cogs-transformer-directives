const _ = require('underscore');
const glob = require('glob');
const path = require('path');

const HEADER = new RegExp(
  '^(' +
    '\\s*(' +
      '(/\\*[\\s\\S]*?\\*/)|' + // Multi-line /* comment */
      '(###[\\s\\S]*?###)|' +   // Multi-line ### comment ###
      '(<!--[\\s\\S]*?-->)|' +  // HTML <!-- comment -->
      '(//.*)|' +               // Single-line // comment
      '(#.*)' +                 // Single-line # comment
    ')\\n?' +                   // Grab the trailing newline
  ')+'
);
const DIRECTIVE_LINE = /^[^\w\n]*=[ \t]*\w+([ \t]+\S+(,[ \t]*\S+)*)?(\n|$)/gm;
const DIRECTIVE = /\=[ \t]*(\S*)[ \t]*(.*)/;

const getDirectiveFromLine = line => _.compact(line.match(DIRECTIVE).slice(1));

const removeDirectiveLine = (source, line) => source.replace(line, '\n');

const extractDirectives = source => {

  // Grab the header of the file where any directives would be.
  const header = (source.match(HEADER) || [''])[0];

  // Pull out the specific directive lines.
  const lines = header.match(DIRECTIVE_LINE) || [];

  // Extract the directive from each line and ensure 'requireself' is present.
  return {
    source: _.reduce(lines, removeDirectiveLine, source),
    directives: _.map(lines, getDirectiveFromLine)
  };
};

const directiveGlob = (pattern, file, type) =>
  new Promise((resolve, reject) => {
    if (!pattern) {
      throw new Error(`'${type.slice(0, -1)}' requires a glob pattern`);
    }

    const base = pattern[0] === '.' ? path.dirname(file.path) : '';
    pattern = path.relative('.', path.resolve(base, pattern));
    glob(pattern, {nodir: true}, (er, paths) => {
      if (er) return reject(er);

      if (!paths.length) {
        return reject(new Error(`No files match '${pattern}'`));
      }

      const obj = {globs: [pattern]};
      obj[type] = paths;
      resolve(obj);
    });
  });

const DIRECTIVES = {
  requireself: (__, file) => Promise.resolve({requires: file.requires}),
  require: _.partial(directiveGlob, _, _, 'requires'),
  link: _.partial(directiveGlob, _, _, 'links')
};

const getDependencies = (directive, file) =>
  new Promise(resolve => {
    const action = directive[0];
    const fn = DIRECTIVES[action];
    if (!fn) throw new Error(`Invalid directive: '${action}'`);

    resolve(fn(directive[1], file));
  });

module.exports = ({file}) => {
  const extracted = extractDirectives(file.buffer.toString());
  return Promise.all(_.map(extracted.directives, directive =>
    getDependencies(directive, file)
  )).then(dependencies => {
    dependencies = _.reduce(dependencies, function (a, b) {
      return {
        requires: a.requires.concat(b.requires || []),
        links: a.links.concat(b.links || []),
        globs: a.globs.concat(b.globs || [])
      };
    }, {requires: [], links: [], globs: []});
    return {
      buffer: new Buffer(extracted.source),
      requires: dependencies.requires.concat(file.requires),
      links: dependencies.links.concat(file.links),
      globs: dependencies.globs.concat(file.globs)
    };
  });
};
