import fs from 'node:fs/promises';
import path from 'node:path';

import _ from 'underscore';

const { Buffer } = globalThis;

const headerRegExp = new RegExp(
  '^(' +
    '\\s*(' +
    '(/\\*[\\s\\S]*?\\*/)|' + // Multi-line /* comment */
    '(###[\\s\\S]*?###)|' + // Multi-line ### comment ###
    '(<!--[\\s\\S]*?-->)|' + // HTML <!-- comment -->
    '(//.*)|' + // Single-line // comment
    '(#.*)' + // Single-line # comment
    ')\\n?' + // Grab the trailing newline
    ')+'
);

const directiveLineRegExp =
  /^[^\w\n]*=[ \t]*\w+([ \t]+\S+(,[ \t]*\S+)*)?(\n|$)/gm;

const directiveRegExp = /=[ \t]*(\S*)[ \t]*(.*)/;

const getDirectiveFromLine = line =>
  _.compact(line.match(directiveRegExp).slice(1));

const removeDirectiveLine = (source, line) => source.replace(line, '\n');

const extractDirectives = source => {
  // Grab the header of the file where any directives would be.
  const header = (source.match(headerRegExp) || [''])[0];

  // Pull out the specific directive lines.
  const lines = header.match(directiveLineRegExp) || [];

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
  const paths = await Array.fromAsync(fs.glob(pattern, { nodir: true }));

  if (!paths.length) throw new Error(`No files match '${pattern}'`);

  return { [type]: paths, links: [pattern] };
};

const actions = {
  requireself: async (__, file) => ({ requires: file.requires }),
  require: _.partial(directiveGlob, _, _, 'requires'),
  link: _.partial(directiveGlob, _, _, 'links')
};

const getDependencies = async (directive, file) => {
  const action = directive[0];
  const fn = actions[action];
  if (!fn) throw new Error(`Invalid directive: '${action}'`);

  return fn(directive[1], file);
};

export default async ({ file }) => {
  const { directives, source } = extractDirectives(file.buffer.toString());
  const dependencies = await Promise.all(
    _.map(directives, directive => getDependencies(directive, file))
  );

  const { links, requires } = _.reduce(
    dependencies,
    (a, b) => ({
      requires: a.requires.concat(b.requires || []),
      links: a.links.concat(b.links || [])
    }),
    { links: [], requires: [] }
  );

  return {
    buffer: Buffer.from(source),
    requires: requires.concat(file.requires),
    links: links.concat(file.links)
  };
};
