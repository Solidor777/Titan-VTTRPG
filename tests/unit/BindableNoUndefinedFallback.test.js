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

/** @type {RegExp} A `$bindable(` call, capturing its argument text up to the first closing parenthesis. */
const BINDABLE_CALL = /\$bindable\(([^)]*)\)/g;

describe('bindable props', () => {
   it('finds the components and their bindable declarations', () => {
      expect(SVELTE_FILES.length).toBeGreaterThan(100);

      /** @type {number} How many `$bindable(` declarations exist across the components. */
      const declarations = SVELTE_FILES.reduce(
         (count, file) => count + (readFileSync(file, 'utf-8').match(/\$bindable\(/g) ?? []).length,
         0,
      );
      expect(declarations).toBeGreaterThan(50);
   });

   // Svelte throws `props_invalid_value` (reactivity/props.js, the `fallback !== undefined` check) when a parent binds
   // an undefined value to a bindable prop whose fallback is not `undefined`. `void 0` counts: the compiler wraps it in
   // a function. A bindable declares no fallback at all, so the throw is structurally impossible; the default lives
   // where the value is read.
   it.each(SVELTE_FILES.map((file) => path.relative(SOURCE_DIRECTORY, file)))(
      '%s declares no bindable fallback',
      (relativePath) => {
         /** @type {string} The component source. */
         const source = readFileSync(path.join(SOURCE_DIRECTORY, relativePath), 'utf-8');

         /** @type {string[]} The argument text of every bindable declaration. */
         const args = [...source.matchAll(BINDABLE_CALL)].map((match) => match[1].trim());
         expect(args.filter((arg) => arg !== '')).toEqual([]);
      },
   );
});
