import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {string} The source directory scanned for Svelte components. */
const SOURCE_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/**
 * Lists every Svelte component under a directory.
 * @param {string} directory - The directory to scan recursively.
 * @returns {string[]} The absolute paths of the `.svelte` files found.
 */
function listSvelteFiles(directory) {
   /** @type {string[]} The files found so far. */
   const files = [];
   for (const entry of readdirSync(directory, { withFileTypes: true })) {
      /** @type {string} The entry's absolute path. */
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
         files.push(...listSvelteFiles(entryPath));
      } else if (entry.name.endsWith('.svelte')) {
         files.push(entryPath);
      }
   }
   return files;
}

/** @type {string[]} Every Svelte component in `src`. */
const SVELTE_FILES = listSvelteFiles(SOURCE_DIRECTORY);

describe('bindable props', () => {
   it('finds the components', () => {
      expect(SVELTE_FILES.length).toBeGreaterThan(100);
   });

   // A bindable prop with any fallback argument, even `undefined`, makes Svelte throw `props_invalid_value` when a
   // parent binds it to a value that is currently undefined (e.g. a rules element with no stored `rounding`).
   it.each(SVELTE_FILES.map((file) => path.relative(SOURCE_DIRECTORY, file)))(
      '%s declares no bindable fallback of undefined',
      (relativePath) => {
         /** @type {string} The component source. */
         const source = readFileSync(path.join(SOURCE_DIRECTORY, relativePath), 'utf-8');
         expect(source).not.toMatch(/\$bindable\(\s*(void 0|undefined)\s*\)/);
      },
   );
});
