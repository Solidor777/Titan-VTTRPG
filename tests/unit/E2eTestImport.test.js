import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseNodes, staticKeyName, TREE_SCAN_TIMEOUT } from './helpers/parseSource.js';

// Every e2e test runs under the harness gates of `tests/e2e/harness.js` `test`, which fail a test when a page that
// joined the world collected an uncaught page error or a hook error (titan-codebase `conventions.md`, shared-world
// harness). A spec that took `test` from `@playwright/test` itself would run without them, so this guard reads every
// source under `tests/e2e` and `tests/shared` as syntax (`helpers/parseSource.js`) and fails on any way of reaching
// Playwright's `test` outside `harness.js`:
// - an import of `test` by name, or of the whole module (`import * as …`, a default import);
// - a re-export of `test` or of the whole module;
// - a dynamic `import('@playwright/test')`.
//
// Known limit of the scan: a module specifier held in a variable (`import(name)`) is not matched.

/** @type {string} The repository's `tests` directory. */
const TESTS_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string} The module whose `test` only the harness may extend. */
const PLAYWRIGHT_MODULE = '@playwright/test';

/** @type {string} The one source that imports Playwright's `test`: the harness that extends it. */
const HARNESS_FILE = 'e2e/harness.js';

/**
 * @typedef {object} TestImport
 * @property {string} file - The source path relative to `tests`, with forward slashes.
 * @property {number} line - The 1-based line the import starts on.
 * @property {string} text - How the source reaches Playwright's `test`.
 */

/**
 * Names the way a node reaches Playwright's `test`, if it does.
 * @param {object} node - A syntax-tree node.
 * @returns {string | null} `import test`, `import *`, `import default`, `export test`, `export *` or `import()`, or
 * `null` when the node does not reach it.
 */
function describeTestImport(node) {
   if (node.type === 'ImportExpression') {
      return node.source.type === 'Literal' && node.source.value === PLAYWRIGHT_MODULE ? 'import()' : null;
   }
   if (!node.source || node.source.value !== PLAYWRIGHT_MODULE) {
      return null;
   }
   if (node.type === 'ExportAllDeclaration') {
      return 'export *';
   }
   for (const specifier of node.specifiers ?? []) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
         return 'import *';
      }
      if (specifier.type === 'ImportDefaultSpecifier') {
         return 'import default';
      }
      /** @type {object} The imported or local-side name node of the specifier. */
      const imported = specifier.type === 'ExportSpecifier' ? specifier.local : specifier.imported;
      if (staticKeyName(imported, false) === 'test') {
         return node.type === 'ImportDeclaration' ? 'import test' : 'export test';
      }
   }
   return null;
}

/**
 * Finds the places a source reaches Playwright's `test`.
 * @param {string} file - The source path relative to `tests`, with forward slashes.
 * @param {string} source - The source text.
 * @returns {TestImport[]} One entry per import, re-export or dynamic import of it.
 */
function findTestImports(file, source) {
   return parseNodes(source, file).flatMap((node) => {
      /** @type {string | null} How the node reaches Playwright's `test`. */
      const text = describeTestImport(node);
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

describe('e2e test import', () => {
   it('flags each way of reaching Playwright\'s test', () => {
      /** @type {[string, string][]} Each source with the one finding it must yield. */
      const flagged = [
         [
            'import { expect, test } from \'@playwright/test\';',
            'import test',
         ],
         [
            'import { test as base } from \'@playwright/test\';',
            'import test',
         ],
         [
            'import { \'test\' as base } from \'@playwright/test\';',
            'import test',
         ],
         [
            'import * as playwright from \'@playwright/test\';',
            'import *',
         ],
         [
            'import playwright from \'@playwright/test\';',
            'import default',
         ],
         [
            'export { test } from \'@playwright/test\';',
            'export test',
         ],
         [
            'export * from \'@playwright/test\';',
            'export *',
         ],
         [
            'const { test } = await import(\'@playwright/test\');',
            'import()',
         ],
      ];
      for (const [source, text] of flagged) {
         expect.soft(findTestImports('e2e/x.spec.js', source).map((found) => found.text), source).toEqual([text]);
      }
   });

   it('passes the harness import, other Playwright names, comments and prose', () => {
      /** @type {string[]} Sources that do not reach Playwright's `test`. */
      const clean = [
         'import { expect, test } from \'./harness.js\';',
         'import { expect } from \'@playwright/test\';',
         'import { chromium } from \'@playwright/test\';',
         '// import { test } from \'@playwright/test\';',
         '/** @type {import(\'@playwright/test\').Page} */ let page;',
         'test(\'imports nothing from @playwright/test\', async () => {});',
      ];
      for (const source of clean) {
         expect.soft(findTestImports('e2e/x.spec.js', source), source).toEqual([]);
      }
   });

   it('reports the line an import starts on', () => {
      expect(findTestImports('e2e/x.spec.js', 'a;\nb;\nimport { test } from \'@playwright/test\';')[0].line).toBe(3);
   });

   it('finds Playwright\'s test reached only by the harness', { timeout: TREE_SCAN_TIMEOUT }, () => {
      /** @type {string[]} The scanned sources, relative to `tests`. */
      const sources = [
         ...listSources('e2e'),
         ...listSources('shared'),
      ];
      expect(sources).toContain(HARNESS_FILE);

      /** @type {TestImport[]} Every way a source reaches Playwright's `test`. */
      const found = sources.flatMap((file) => findTestImports(
         file,
         readFileSync(path.join(TESTS_DIRECTORY, file), 'utf8'),
      ));
      expect.soft(found.filter((entry) => entry.file === HARNESS_FILE).map((entry) => entry.text), 'the harness')
         .toEqual(['import test']);

      /** @type {string[]} Sources other than the harness that reach Playwright's `test`. */
      const offenders = found
         .filter((entry) => entry.file !== HARNESS_FILE)
         .map(({ file, line, text }) => `${file}:${line} — ${text}`);
      expect.soft(
         offenders,
         'Playwright\'s test reached outside the harness (import test from tests/e2e/harness.js):\n'
            + offenders.join('\n'),
      ).toEqual([]);
   });
});
