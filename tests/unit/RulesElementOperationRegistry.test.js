import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { RULES_ELEMENT_OPERATIONS } from '~/system/RulesElementOperations.js';
import { RULES_ELEMENT_FACTORIES } from '~/document/types/item/rules-element/RulesElementFactories.js';

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
   /** @type {string} The file text read from disk. */
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

describe('RULES_ELEMENT_FACTORIES', () => {
   it('is the operation list', () => {
      expect(Object.keys(RULES_ELEMENT_FACTORIES)).toEqual([...RULES_ELEMENT_OPERATIONS]);
   });

   it.each(RULES_ELEMENT_OPERATIONS)('the %s factory builds its own operation and keeps a given uuid', (operation) => {
      /** @type {object} The built element. */
      const element = RULES_ELEMENT_FACTORIES[operation]({ uuid: 'kept-uuid' });
      expect(element.operation).toBe(operation);
      expect(element.uuid).toBe('kept-uuid');
   });

   it('the operation select rebuilds through the registry, with no operation switch of its own', () => {
      /** @type {string} The operation select's source. */
      const source = readFileSync(path.join(
         ROOT,
         'src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte',
      ), 'utf-8');
      expect(source).toContain('RULES_ELEMENT_FACTORIES');
      expect(source).not.toMatch(/case '\w+':/);
   });
});
