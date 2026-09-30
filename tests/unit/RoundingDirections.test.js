import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import roundDirectional, { ROUNDING_DIRECTIONS } from '~/helpers/utility-functions/RoundDirectional.js';

/** @type {string} This test file's directory. */
const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(path.resolve(TEST_DIRECTORY, '../../lang/en.json'), 'utf-8'));

/** @type {string} The rules-element editor components' directory. */
const EDITOR_DIRECTORY = path.resolve(TEST_DIRECTORY, '../../src/document/types/item/sheet/rules-element');

/**
 * Every rules-element editor that binds an element's `rounding` field, found by scanning the editors, so an editor
 * added later for another rounding operation is checked too.
 * @type {string[]}
 */
const ROUNDING_EDITORS = readdirSync(EDITOR_DIRECTORY)
   .filter((fileName) => fileName.endsWith('.svelte'))
   .filter((fileName) => readFileSync(path.join(EDITOR_DIRECTORY, fileName), 'utf-8')
      .includes('rulesElement[idx].rounding'));

describe('rounding directions', () => {
   it('offers down (the default for a missing rounding), up, and nearest', () => {
      expect(ROUNDING_DIRECTIONS).toEqual([
         'down',
         'up',
         'nearest',
      ]);
   });

   it.each(ROUNDING_DIRECTIONS)('LOCAL labels the %s direction', (direction) => {
      expect(lang.LOCAL[`${direction}.text`]).toBeTypeOf('string');
      expect(lang.LOCAL[`${direction}.text`].length).toBeGreaterThan(0);
   });

   it.each(ROUNDING_DIRECTIONS)('rounding a mulBase contribution %s rounds the resulting value %s', (direction) => {
      for (let base = 1; base <= 8; base++) {
         expect(base + roundDirectional(base * (0.75 - 1), direction), `base ${base}`)
            .toBe(roundDirectional(base * 0.75, direction));
      }
   });

   it('finds the mulBase and mulSum editors', () => {
      expect(ROUNDING_EDITORS).toEqual(expect.arrayContaining([
         'ItemSheetMulBaseSettings.svelte',
         'ItemSheetMulSumSettings.svelte',
      ]));
   });

   it.each(ROUNDING_EDITORS)('%s offers exactly ROUNDING_DIRECTIONS', (fileName) => {
      /** @type {string} The editor source. */
      const source = readFileSync(path.join(EDITOR_DIRECTORY, fileName), 'utf-8');
      expect(source).toContain('options={ROUNDING_DIRECTIONS}');
      expect(source).not.toMatch(/roundingOptions/);
   });
});
