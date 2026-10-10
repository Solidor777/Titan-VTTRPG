import { describe, it, expect } from 'vitest';
import { applyScalingSteps } from '~/check/types/casting-check/ScalingAspectChange.js';

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

describe('applyScalingSteps', () => {
   it('moves one aspect and derives remaining successes, damage and healing', () => {
      expect(applyScalingSteps(stored(), 0, 1)).toMatchObject({
         extraSuccessesRemaining: 4,
         damage: 8,
         healing: 1,
      });
      expect(applyScalingSteps(stored(), 0, -2)).toMatchObject({
         extraSuccessesRemaining: 7,
         damage: 2,
      });
      const bought = applyScalingSteps(stored(), 1, 1);
      expect(bought).toMatchObject({
         extraSuccessesRemaining: 2,
         damage: 6,
         healing: 2,
      });
      expect(bought.scalingAspect.map((aspect) => aspect.currentValue)).toEqual([
         6,
         2,
      ]);
   });

   it('applies to the card as stored, so changes to different aspects both stay', () => {
      const first = applyScalingSteps(stored(), 0, 1);
      const afterFirst = {
         ...stored(),
         ...first,
      };
      const second = applyScalingSteps(afterFirst, 1, 1);
      expect(second.scalingAspect.map((aspect) => aspect.currentValue)).toEqual([
         8,
         2,
      ]);
      expect(second).toMatchObject({
         extraSuccessesRemaining: 1,
         damage: 8,
         healing: 2,
      });
   });

   it('refuses a change below the start, beyond the extra successes, or not naming an aspect and whole steps', () => {
      expect(() => applyScalingSteps(stored(), 0, -3)).toThrow('below its starting value');
      expect(() => applyScalingSteps(stored(), 1, 2)).toThrow('more extra successes');
      expect(() => applyScalingSteps(stored(), 2, 1)).toThrow('does not match');
      expect(() => applyScalingSteps(stored(), 0, 0)).toThrow('does not match');
      expect(() => applyScalingSteps(stored(), 0, 1.5)).toThrow('does not match');
      expect(() => applyScalingSteps(stored(), '0', 1)).toThrow('does not match');
      expect(() => applyScalingSteps({
         ...stored(),
         succeeded: false,
      }, 0, 1)).toThrow('does not match');
   });
});
