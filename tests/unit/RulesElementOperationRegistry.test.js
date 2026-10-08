import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { RULES_ELEMENT_OPERATIONS } from '~/system/RulesElementOperations.js';

/** @type {string} The repository root. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.join(ROOT, 'lang/en.json'), 'utf-8'));

/**
 * Reads the `case '<operation>':` labels of one switch in a source file: from the switch's opening text up to its
 * `default: {` branch.
 * @param {string} relativePath - The source file, relative to the repository root.
 * @param {string} switchStart - Text that starts the switch (unique in the file).
 * @returns {string[]} The case labels, sorted.
 */
function readSwitchCases(relativePath, switchStart) {
   /** @type {string} The source. */
   const source = readFileSync(path.join(ROOT, relativePath), 'utf-8');

   /** @type {number} Where the switch starts. */
   const start = source.indexOf(switchStart);
   expect(start, `${switchStart} in ${relativePath}`).toBeGreaterThanOrEqual(0);

   /** @type {string} The switch body up to its default branch. */
   const body = source.slice(start, source.indexOf('default: {', start));
   return [...body.matchAll(/case '(\w+)':/g)].map((match) => match[1]).sort();
}

describe('rules-element operations', () => {
   it('lists the operations in editor display order', () => {
      expect(RULES_ELEMENT_OPERATIONS).toEqual([
         'flatModifier',
         'mulBase',
         'mulSum',
         'setSum',
         'fastHealing',
         'persistentDamage',
         'turnMessage',
         'rollMessage',
         'conditionalRatingModifier',
         'conditionalCheckModifier',
      ]);
   });

   it.each(RULES_ELEMENT_OPERATIONS)('LOCAL labels the %s operation', (operation) => {
      expect(lang.LOCAL[`${operation}.text`]).toBeTypeOf('string');
   });

   it('the item sheet dispatches an editor for exactly the operations', () => {
      expect(readSwitchCases(
         'src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte',
         'const operationSettingsComponent',
      )).toEqual([...RULES_ELEMENT_OPERATIONS].sort());
   });

   it('the actor buckets exactly the operations', () => {
      expect(readSwitchCases(
         'src/document/types/actor/types/character/CharacterDataModel.js',
         'switch (element.operation) {',
      )).toEqual([...RULES_ELEMENT_OPERATIONS].sort());
   });
});
