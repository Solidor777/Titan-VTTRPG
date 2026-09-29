import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { USER_KEYED_CHECK_MODIFIER_SELECTORS } from '~/system/ConditionalCheckModifierTypes.js';

// The rules-element editors render a text input for every selector whose key the user types. The check-modifier cache
// camel-cases those keys through USER_KEYED_CHECK_MODIFIER_SELECTORS, so the constant and the editors must agree; a new
// typed selector in an editor fails here until the constant follows it.

/** @type {string} The rules-element editor components' directory. */
const EDITOR_DIRECTORY = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../src/document/types/item/sheet/rules-element',
);

/**
 * Reads the selectors an editor's key-component switch renders as a text input.
 * @param {string} fileName - The editor component's file name.
 * @returns {string[]} The sorted selector names.
 */
function readTextInputSelectors(fileName) {
   /** @type {string} The component source. */
   const source = readFileSync(path.join(EDITOR_DIRECTORY, fileName), 'utf-8');

   /** @type {string[]} The selectors found. */
   const selectors = [];
   for (const match of source.matchAll(/((?:case '\w+':\s*)+)\{\s*return DocumentTextInput;/g)) {
      selectors.push(...[...match[1].matchAll(/case '(\w+)':/g)].map((label) => label[1]));
   }
   return selectors.sort();
}

describe('typed-key selectors in the rules-element editors', () => {
   it('the check modifier editor types exactly the user-keyed check modifier selectors', () => {
      expect(readTextInputSelectors('ItemSheetConditionalCheckModifierSettings.svelte')).toEqual(
         [...USER_KEYED_CHECK_MODIFIER_SELECTORS].sort(),
      );
   });

   it('the roll message editor types only user-keyed check modifier selectors', () => {
      /** @type {string[]} The roll message editor's typed selectors. */
      const selectors = readTextInputSelectors('ItemSheetRollMessageSettings.svelte');
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) {
         expect(USER_KEYED_CHECK_MODIFIER_SELECTORS).toContain(selector);
      }
   });

   it('the rating modifier editor types only selectors the check modifier cache never reads', () => {
      /** @type {string[]} The rating modifier editor's typed selectors. */
      const selectors = readTextInputSelectors('ItemSheetConditionalRatingModifierSettings.svelte');
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) {
         expect(USER_KEYED_CHECK_MODIFIER_SELECTORS).not.toContain(selector);
      }
   });
});
