import { describe, expect, it } from 'vitest';
import { renderItemCheckLines } from '~/spreadsheet/markdown/renderers/RenderItemChecks.js';

/**
 * A label resolver that title-cases the raw key, standing in for the real lang lookup.
 * @param {string} key - The label key.
 * @param {string} [fallback] - The fallback text.
 * @returns {string} `fallback` when given, else the key with its first character capitalized.
 */
function fakeLabels(key, fallback) {
   return fallback ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

/**
 * Builds a minimal item-check fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The check fixture.
 */
function makeCheck(overrides = {}) {
   return {
      label: 'Slam',
      attribute: 'body',
      skill: 'athletics',
      difficulty: 4,
      complexity: 1,
      resolveCost: 0,
      isDamage: false,
      isHealing: false,
      scaling: true,
      resistanceCheck: 'none',
      initialValue: 1,
      ...overrides,
   };
}

describe('renderItemCheckLines', () => {
   it('renders the base label, attribute, skill, and D:C', () => {
      expect(renderItemCheckLines([makeCheck()], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1  ',
      ]);
   });

   it('appends a Resolve segment when resolveCost is greater than zero', () => {
      expect(renderItemCheckLines([makeCheck({ resolveCost: 2 })], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1, 2 Resolve  ',
      ]);
   });

   it('appends a scaling Damage segment when isDamage and scaling', () => {
      expect(renderItemCheckLines([makeCheck({ isDamage: true, initialValue: 3 })], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1, Damage 3 \\+ ES  ',
      ]);
   });

   it('appends a non-scaling Healing segment when isHealing and not scaling', () => {
      expect(renderItemCheckLines([
         makeCheck({ isHealing: true, initialValue: 2, scaling: false }),
      ], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1, Healing 2  ',
      ]);
   });

   it('appends a resisted-by segment when resistanceCheck is set and not none', () => {
      expect(renderItemCheckLines([makeCheck({ resistanceCheck: 'resilience' })], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1, resisted by Resilience  ',
      ]);
   });

   it('omits a resisted-by segment when resistanceCheck is none', () => {
      expect(renderItemCheckLines([makeCheck({ resistanceCheck: 'none' })], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1  ',
      ]);
   });

   it('combines all segments in order', () => {
      expect(renderItemCheckLines([makeCheck({
         resolveCost: 1,
         isDamage: true,
         initialValue: 2,
         resistanceCheck: 'resilience',
      })], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1, 1 Resolve, Damage 2 \\+ ES, resisted by Resilience  ',
      ]);
   });

   it('renders one line per check, in stored order', () => {
      expect(renderItemCheckLines([
         makeCheck({ label: 'Slam' }),
         makeCheck({ label: 'Poison' }),
      ], fakeLabels)).toEqual([
         '**Slam:** Body (Athletics) 4:1  ',
         '**Poison:** Body (Athletics) 4:1  ',
      ]);
   });

   it('returns an empty array with no checks', () => {
      expect(renderItemCheckLines([], fakeLabels)).toEqual([]);
      expect(renderItemCheckLines(undefined, fakeLabels)).toEqual([]);
   });

   it('escapes Markdown specials in the check label', () => {
      expect(renderItemCheckLines([makeCheck({ label: 'Two+Handed*' })], fakeLabels)).toEqual([
         '**Two\\+Handed\\*:** Body (Athletics) 4:1  ',
      ]);
   });
});
