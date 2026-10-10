import { describe, it, expect } from 'vitest';
import { applyScalingChange, extractScalingChange } from '~/check/types/casting-check/ScalingAspectChange.js';

/**
 * Builds stored casting results: a damage aspect (cost 1, starts at 2, step 2) and a healing aspect (cost 3, starts
 * at 1, step 1), 7 extra successes of which 2 are spent on two damage steps.
 * @returns {object} The results.
 */
function stored() {
   return {
      succeeded: true,
      successes: 8,
      extraSuccesses: 7,
      extraSuccessesRemaining: 5,
      damage: 6,
      healing: 1,
      dice: [{ final: 6 }],
      scalingAspect: [
         {
            isDamage: true,
            isHealing: false,
            cost: 1,
            initialValue: 2,
            currentValue: 6,
            label: 'A',
         },
         {
            isDamage: false,
            isHealing: true,
            cost: 3,
            initialValue: 1,
            currentValue: 1,
            label: 'B',
         },
      ],
   };
}

describe('extractScalingChange', () => {
   it('reads the values out of the update the scaling controls make', () => {
      const results = stored();
      results.scalingAspect[0].currentValue = 8;
      results.extraSuccessesRemaining = 4;
      results.damage = 8;
      expect(extractScalingChange(stored(), { system: { results } })).toEqual([
         8,
         1,
      ]);
   });

   it('refuses an update that changes anything else', () => {
      for (const edit of [
         (results) => {
            results.dice[0].final = 1;
         },
         (results) => {
            results.successes = 99;
         },
         (results) => {
            results.scalingAspect[0].cost = 0;
         },
         (results) => {
            results.scalingAspect.pop();
         },
      ]) {
         const results = stored();
         edit(results);
         expect(extractScalingChange(stored(), { system: { results } })).toBeNull();
      }
      expect(extractScalingChange(stored(), { flags: { x: 1 } })).toBeNull();
      expect(extractScalingChange(stored(), {
         system: { results: stored() },
         content: 'x',
      })).toBeNull();
   });
});

describe('applyScalingChange', () => {
   it('derives remaining successes, damage and healing from the requested values', () => {
      expect(applyScalingChange(stored(), [
         8,
         1,
      ])).toMatchObject({
         extraSuccessesRemaining: 4,
         damage: 8,
         healing: 1,
      });
      expect(applyScalingChange(stored(), [
         2,
         1,
      ])).toMatchObject({
         extraSuccessesRemaining: 7,
         damage: 2,
      });
      expect(applyScalingChange(stored(), [
         4,
         2,
      ])).toMatchObject({
         extraSuccessesRemaining: 3,
         damage: 4,
         healing: 2,
      });
   });

   it('refuses values that are not steps, below the start, or dearer than the extra successes', () => {
      expect(() => applyScalingChange(stored(), [
         5,
         1,
      ])).toThrow('not a step');
      expect(() => applyScalingChange(stored(), [
         0,
         1,
      ])).toThrow('not a step');
      expect(() => applyScalingChange(stored(), [
         4,
         4,
      ])).toThrow('more extra successes');
      expect(() => applyScalingChange(stored(), [4])).toThrow('does not match');
   });
});
