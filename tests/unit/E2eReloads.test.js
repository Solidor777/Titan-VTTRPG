import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseNodes, staticKeyName, TREE_SCAN_TIMEOUT } from './helpers/parseSource.js';

// A mid-file world reload goes through `tests/e2e/world.js` `reloadWorld(page, { ready })`: the reload, the `/game` URL
// wait that fails a lost session, and the readiness wait, so no spec repeats them inline (titan-codebase
// `conventions.md`, "Mid-file `page.reload()` idiom"). This guard reads every source under `tests/e2e` and
// `tests/shared` as syntax (`helpers/parseSource.js`, which also reads the code held in strings) and fails on a page
// navigation anywhere but its one permitted site:
// - a reload: a `reload(` or `debouncedReload(` call, through any receiver (`page.reload(`, `location.reload(`,
//   `foundry.utils.debouncedReload(`);
// - a location change: `location.assign(` or `location.replace(`, or an assignment to `location` or `location.href`;
// - a navigation: a `goto(`, `goBack(` or `goForward(` call.
//
// Known limit of the scan: a callee reached through a computed name held in a variable (`page[method](`) is not
// matched, and code held in a string is found only when the string's text alone parses.

/** @type {string} The repository's `tests` directory. */
const TESTS_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Set<string>} The calls that reload the page, through any receiver. */
const RELOAD_CALLS = new Set([
   'reload',
   'debouncedReload',
]);

/** @type {Set<string>} The calls that navigate the page, through any receiver. */
const NAVIGATION_CALLS = new Set([
   'goto',
   'goBack',
   'goForward',
]);

/** @type {Set<string>} The `location` methods that load another document. */
const LOCATION_CALLS = new Set([
   'assign',
   'replace',
]);

/**
 * @typedef {object} PermittedNavigation
 * @property {string} file - The source path relative to `tests`, with forward slashes.
 * @property {string} text - The navigation's text, as `describeNavigation` writes it.
 * @property {string} reason - Why the site may navigate.
 */

/** @type {PermittedNavigation[]} The navigations allowed outside the rule; each must exist exactly once in its file. */
const PERMITTED = [
   {
      file: 'e2e/world.js',
      text: '.reload(',
      reason: '`reloadWorld`, the one shared reload with its readiness wait.',
   },
   {
      file: 'e2e/fixtures.js',
      text: '.goto(',
      reason: '`joinWorld` (which `login` calls), the first navigation of a fresh page to `/join`.',
   },
];

/**
 * @typedef {object} Navigation
 * @property {string} file - The source path relative to `tests`, with forward slashes.
 * @property {number} line - The 1-based line the navigation starts on.
 * @property {string} text - The navigation's text: `.<method>(`, `<function>(`, or `location =`.
 */

/**
 * Reads the static name of a callee or assignment target: an identifier, or a member's property.
 * @param {object} node - The expression.
 * @returns {string | null} The name, or `null` when it is not static.
 */
function lastName(node) {
   if (node.type === 'Identifier') {
      return node.name;
   }
   if (node.type === 'MemberExpression') {
      return staticKeyName(node.property, node.computed);
   }
   return null;
}

/**
 * Names the page navigation a node makes, if any.
 * @param {object} node - A syntax-tree node.
 * @returns {string | null} The navigation's text, or `null` when the node makes none.
 */
function describeNavigation(node) {
   if (node.type === 'CallExpression') {
      /** @type {string | null} The called function's or method's name. */
      const name = lastName(node.callee);
      /** @type {string} How the call is written: `.` before a method, nothing before a bare function. */
      const prefix = node.callee.type === 'MemberExpression' ? '.' : '';
      if (RELOAD_CALLS.has(name) || NAVIGATION_CALLS.has(name)) {
         return `${prefix}${name}(`;
      }
      if (LOCATION_CALLS.has(name) && node.callee.type === 'MemberExpression'
         && lastName(node.callee.object) === 'location') {
         return `location.${name}(`;
      }
   }
   if (node.type === 'AssignmentExpression') {
      /** @type {object} The assigned target. */
      const target = node.left;
      if (lastName(target) === 'location') {
         return 'location =';
      }
      if (target.type === 'MemberExpression' && lastName(target) === 'href' && lastName(target.object) === 'location') {
         return 'location.href =';
      }
   }
   return null;
}

/**
 * Finds the page navigations in one source.
 * @param {string} file - The source path relative to `tests`, with forward slashes.
 * @param {string} source - The source text.
 * @returns {Navigation[]} One entry per navigation.
 */
function findNavigations(file, source) {
   return parseNodes(source, file).flatMap((node) => {
      /** @type {string | null} The node's navigation. */
      const text = describeNavigation(node);
      return text === null
         ? []
         : [{
            file,
            line: node.loc.start.line,
            text,
         }];
   });
}

/**
 * Lists the `.js` and `.mjs` sources under a directory, relative to `tests`, with forward slashes.
 * @param {string} directory - The directory, relative to `tests`.
 * @returns {string[]} The source paths.
 */
function listSources(directory) {
   return readdirSync(path.join(TESTS_DIRECTORY, directory), { recursive: true })
      .map((entry) => String(entry).replace(/\\/g, '/'))
      .filter((entry) => /\.m?js$/.test(entry))
      .map((entry) => `${directory}/${entry}`);
}

describe('e2e reloads', () => {
   it('flags each page navigation, in every callee form', () => {
      /** @type {[string, string][]} Each source with the one navigation it must yield. */
      const flagged = [
         [
            'await page.reload();',
            '.reload(',
         ],
         [
            'await page?.reload({ waitUntil: \'load\' });',
            '.reload(',
         ],
         [
            'await page[\'reload\']();',
            '.reload(',
         ],
         [
            'await page.evaluate(() => window.location.reload());',
            '.reload(',
         ],
         [
            'await page.evaluate(\'location.reload()\');',
            '.reload(',
         ],
         [
            'await page.evaluate(() => foundry.utils.debouncedReload());',
            '.debouncedReload(',
         ],
         [
            'await page.goto(\'/game\');',
            '.goto(',
         ],
         [
            'await page.goBack();',
            '.goBack(',
         ],
         [
            'await page.evaluate(() => location.assign(\'/game\'));',
            'location.assign(',
         ],
         [
            'await page.evaluate(() => { window.location.href = \'/game\'; });',
            'location.href =',
         ],
         [
            'await page.evaluate(() => { location = \'/game\'; });',
            'location =',
         ],
      ];
      for (const [source, text] of flagged) {
         expect.soft(findNavigations('e2e/x.spec.js', source).map((navigation) => navigation.text), source)
            .toEqual([text]);
      }
   });

   it('passes the shared reload, comments, prose and other calls', () => {
      /** @type {string[]} Sources with no page navigation. */
      const clean = [
         'await reloadWorld(page);',
         'await reloadWithMode(page, \'automatic\');',
         '// await page.reload();',
         'test(\'a dragged position persists across a reload\', async () => {});',
         'const url = page.url();',
         'const where = location.pathname;',
         'await sheet.render(true);',
      ];
      for (const source of clean) {
         expect.soft(findNavigations('e2e/x.spec.js', source), source).toEqual([]);
      }
   });

   it('reports the line a navigation starts on', () => {
      expect(findNavigations('e2e/x.spec.js', 'a;\nb;\nawait page.reload();')[0].line).toBe(3);
   });

   it('finds the permitted navigations and no other in the e2e sources', { timeout: TREE_SCAN_TIMEOUT }, () => {
      /** @type {string[]} The scanned sources, relative to `tests`. */
      const sources = [
         ...listSources('e2e'),
         ...listSources('shared'),
      ];
      expect(sources).toContain('e2e/world.js');
      expect(sources).toContain('e2e/fixtures.js');

      /** @type {Navigation[]} Every navigation found. */
      const navigations = sources.flatMap((file) => findNavigations(
         file,
         readFileSync(path.join(TESTS_DIRECTORY, file), 'utf8'),
      ));

      /** @type {string[]} Permitted navigations not found exactly once. */
      const miscounted = PERMITTED
         .map((entry) => ({
            entry,
            count: navigations
               .filter((navigation) => navigation.file === entry.file && navigation.text === entry.text).length,
         }))
         .filter(({ count }) => count !== 1)
         .map(({ entry, count }) => `${entry.file} ${entry.text} found ${count} times`);
      expect.soft(miscounted, 'each permitted navigation is its file\'s one site of that kind').toEqual([]);

      /** @type {string[]} Navigations outside the permitted sites. */
      const offenders = navigations
         .filter((navigation) => !PERMITTED
            .some((entry) => entry.file === navigation.file && entry.text === navigation.text))
         .map(({ file, line, text }) => `${file}:${line} — ${text}`);
      expect.soft(
         offenders,
         'page navigations outside world.js reloadWorld (reload through reloadWorld(page, { ready })):\n'
            + offenders.join('\n'),
      ).toEqual([]);
   });
});
