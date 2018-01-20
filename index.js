const _ = require('underscore');
const {promisify} = require('util');
const path = require('path');

const glob = promisify(require('glob'));

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

const directiveGlob = async (pattern, file, type) => {
  if (!pattern) {
    throw new Error(`'${type.slice(0, -1)}' requires a glob pattern`);
  }

  const base = pattern[0] === '.' ? path.dirname(file.path) : '';
  pattern = path.relative('.', path.resolve(base, pattern));
  const paths = await glob(pattern, {nodir: true});

  if (!paths.length) throw (new Error(`No files match '${pattern}'`));

  return {[type]: paths, links: [pattern]};
};

const DIRECTIVES = {
  requireself: async (__, file) => ({requires: file.requires}),
  require: _.partial(directiveGlob, _, _, 'requires'),
  link: _.partial(directiveGlob, _, _, 'links')
};

const getDependencies = async (directive, file) => {
  const action = directive[0];
  const fn = DIRECTIVES[action];
  if (!fn) throw new Error(`Invalid directive: '${action}'`);

  return fn(directive[1], file);
};

module.exports = async ({file}) => {
  const {directives, source} = extractDirectives(file.buffer.toString());
  const dependencies = await Promise.all(_.map(directives, directive =>
    getDependencies(directive, file)
  ));

  const {links, requires} = _.reduce(dependencies, (a, b) => ({
    requires: a.requires.concat(b.requires || []),
    links: a.links.concat(b.links || [])
  }), {links: [], requires: []});

  return {
    buffer: new Buffer(source),
    requires: requires.concat(file.requires),
    links: links.concat(file.links)
  };
};
