import { describe, expect, it } from 'vitest';
import { renderTraitList } from '~/spreadsheet/markdown/renderers/RenderTraits.js';

/**
 * A label resolver that title-cases the raw trait key, standing in for the real lang lookup.
 * @param {string} key - The label key.
 * @returns {string} The key with its first character capitalized.
 */
function fakeLabels(key) {
   return key.charAt(0).toUpperCase() + key.slice(1);
}

describe('renderTraitList', () => {
   it('renders a boolean-true trait as its label alone', () => {
      expect(renderTraitList([{ name: 'slashing', value: true }], [], fakeLabels)).toBe('Slashing');
   });

   it('renders a numeric trait as "Label N"', () => {
      expect(renderTraitList([{ name: 'blast', value: 1 }], [], fakeLabels)).toBe('Blast 1');
   });

   it('skips a false trait and a zero-value numeric trait', () => {
      expect(renderTraitList([
         { name: 'slashing', value: false },
         { name: 'blast', value: 0 },
      ], [], fakeLabels)).toBe('');
   });

   it('appends custom trait names after standard traits, comma-separated', () => {
      expect(renderTraitList(
         [{ name: 'slashing', value: true }],
         [{ name: 'My Trait' }],
         fakeLabels,
      )).toBe('Slashing, My Trait');
   });

   it('mixes boolean, numeric, and custom traits in stored order', () => {
      expect(renderTraitList(
         [
            { name: 'flurry', value: true },
            { name: 'slashing', value: true },
         ],
         [],
         fakeLabels,
      )).toBe('Flurry, Slashing');
   });

   it('returns an empty string with no standard or custom traits', () => {
      expect(renderTraitList([], [], fakeLabels)).toBe('');
      expect(renderTraitList(undefined, undefined, fakeLabels)).toBe('');
   });
});
