import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TYPED_KEY_SELECTORS } from '~/system/ConditionalCheckModifierTypes.js';

// Each rules-element editor renders a text input for every selector whose key the user types, and the matching
// CharacterDataModel builder camel-cases those keys through TYPED_KEY_SELECTORS[operation]. The map and the editors
// must agree exactly, so a typed selector added to an editor without its builder entry (or the reverse) fails here.

/** @type {string} The rules-element editor components' directory. */
const EDITOR_DIRECTORY = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../src/document/types/item/sheet/rules-element',
);

/**
 * The editor component of each operation, keyed like TYPED_KEY_SELECTORS.
 * @type {Record<string, string>}
 */
const EDITORS = {
   conditionalCheckModifier: 'ItemSheetConditionalCheckModifierSettings.svelte',
   conditionalRatingModifier: 'ItemSheetConditionalRatingModifierSettings.svelte',
   rollMessage: 'ItemSheetRollMessageSettings.svelte',
};

/**
 * Reads an editor's text-input selectors and the number of text-input references it holds.
 * @param {string} fileName - The editor component's file name.
 * @returns {{paths: number, references: number, selectors: string[]}} The number of `case` groups returning a text
 * input, the number of `DocumentTextInput` uses beyond its import, and the sorted selectors those groups name.
 */
function scanEditor(fileName) {
   /** @type {string} The component source. */
   const source = readFileSync(path.join(EDITOR_DIRECTORY, fileName), 'utf-8');

   /** @type {string[]} The selectors found. */
   const selectors = [];
   /** @type {number} The case groups that return a text input. */
   let paths = 0;
   for (const match of source.matchAll(/((?:case '\w+':\s*)+)\{\s*return DocumentTextInput;/g)) {
      paths++;
      selectors.push(...[...match[1].matchAll(/case '(\w+)':/g)].map((label) => label[1]));
   }

   // Outside its import line every use must be a matched case group, so a brace-less case, a `default:` path, or a
   // template use fails the count comparison.
   /** @type {number} The uses of the component beyond its import. */
   const references = (source.replace(/^\s*import DocumentTextInput .*$/m, '').match(/\bDocumentTextInput\b/g) ?? [])
      .length;
   return {
      paths,
      references,
      selectors: selectors.sort(),
   };
}

describe('typed-key selectors in the rules-element editors', () => {
   it('maps exactly the operations that have an editor', () => {
      expect(Object.keys(TYPED_KEY_SELECTORS).sort()).toEqual(Object.keys(EDITORS).sort());
   });

   it.each(Object.entries(EDITORS))('the %s editor types exactly its TYPED_KEY_SELECTORS entry', (operation, file) => {
      /** @type {{paths: number, references: number, selectors: string[]}} The editor scan. */
      const scan = scanEditor(file);
      expect(scan.references, 'every DocumentTextInput use is a scanned return path').toBe(scan.paths);
      expect(scan.selectors).toEqual([...TYPED_KEY_SELECTORS[operation]].sort());
   });
});
