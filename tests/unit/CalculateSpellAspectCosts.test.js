import { describe, it, expect } from 'vitest';
import calculateSpellAspectCosts from '~/document/types/item/types/spell/CalculateSpellAspectCosts.js';

/**
 * Builds a minimal standard-aspect entry, defaulting fields not under test to the values the schema
 * would otherwise supply.
 * @param {object} overrides - Fields to set on the aspect.
 * @returns {object} An aspect entry suitable for `calculateSpellAspectCosts`.
 */
function aspect(overrides) {
   return {
      option: [],
      resistanceCheck: 'none',
      allOptions: false,
      ...overrides,
   };
}

describe('calculateSpellAspectCosts', () => {
   it('counts each selected option cost once for an optionCosts aspect with two options', () => {
      const result = calculateSpellAspectCosts(
         [aspect({ label: 'inflictCondition', option: ['blinded', 'deafened'] })],
         [],
      );
      expect(result.aspectCosts).toEqual([5]);
      expect(result.totalAspectCost).toBe(5);
   });

   it('reads range initial-value costs by initialValue', () => {
      const result = calculateSpellAspectCosts(
         [
            aspect({ label: 'range', initialValue: 'self' }),
            aspect({ label: 'range', initialValue: 'touch' }),
            aspect({ label: 'range', initialValue: 10 }),
            aspect({ label: 'range', initialValue: 30 }),
            aspect({ label: 'range', initialValue: 50 }),
         ],
         [],
      );
      expect(result.aspectCosts).toEqual([0, 1, 2, 3, 4]);
   });

   it('reads duration unit costs by unit', () => {
      const result = calculateSpellAspectCosts(
         [
            aspect({ label: 'duration', unit: 'rounds' }),
            aspect({ label: 'duration', unit: 'minutes' }),
         ],
         [],
      );
      expect(result.aspectCosts).toEqual([1, 4]);
   });

   it('multiplies optionCost by the number of selected options', () => {
      const result = calculateSpellAspectCosts(
         [aspect({ label: 'decreaseMod', option: ['armor', 'damage'] })],
         [],
      );
      expect(result.aspectCosts).toEqual([4]);
   });

   it('applies allOptionsCost when allOptions is set instead of optionCost', () => {
      const result = calculateSpellAspectCosts(
         [aspect({ label: 'removeCondition', allOptions: true, option: [] })],
         [],
      );
      expect(result.aspectCosts).toEqual([5]);
   });

   it('halves the cost for aspects with an active resistance check, minimum 1', () => {
      const result = calculateSpellAspectCosts(
         [aspect({ label: 'inflictCondition', option: ['blinded'], resistanceCheck: 'reflexes' })],
         [],
      );

      // blinded costs 4; halved and floored is 2.
      expect(result.aspectCosts).toEqual([2]);
   });

   it('floors the halved cost but never below 1', () => {
      const result = calculateSpellAspectCosts(
         [aspect({ label: 'inflictCondition', option: ['deafened'], resistanceCheck: 'reflexes' })],
         [],
      );

      // deafened costs 1; halved and floored is 0, clamped to 1.
      expect(result.aspectCosts).toEqual([1]);
   });

   it('disables an aspect requiring an option when no option is selected', () => {
      const result = calculateSpellAspectCosts([aspect({ label: 'decreaseMod', option: [] })], []);
      expect(result.enabled).toEqual([false]);
      expect(result.aspectCosts).toEqual([0]);
   });

   it('sums the cost of custom aspects into the total', () => {
      const result = calculateSpellAspectCosts(
         [aspect({ label: 'range', initialValue: 'self' })],
         [{ cost: 2 }, { cost: 3 }],
      );
      expect(result.totalAspectCost).toBe(5);
   });

   it('maps a total of 4 to difficulty 4, complexity 1', () => {
      const result = calculateSpellAspectCosts([], [{ cost: 4 }]);
      expect(result.difficulty).toBe(4);
      expect(result.complexity).toBe(1);
   });

   it('maps a total of 5 to difficulty 5, complexity 1', () => {
      const result = calculateSpellAspectCosts([], [{ cost: 5 }]);
      expect(result.difficulty).toBe(5);
      expect(result.complexity).toBe(1);
   });

   it('maps a total of 6 to difficulty 5, complexity 2', () => {
      const result = calculateSpellAspectCosts([], [{ cost: 6 }]);
      expect(result.difficulty).toBe(5);
      expect(result.complexity).toBe(2);
   });

   it('maps a total of 8 to difficulty 5, complexity 4', () => {
      const result = calculateSpellAspectCosts([], [{ cost: 8 }]);
      expect(result.difficulty).toBe(5);
      expect(result.complexity).toBe(4);
   });

   it('clamps a total of 2 up to the minimum difficulty of 4, complexity 1', () => {
      const result = calculateSpellAspectCosts([], [{ cost: 2 }]);
      expect(result.difficulty).toBe(4);
      expect(result.complexity).toBe(1);
   });
});
