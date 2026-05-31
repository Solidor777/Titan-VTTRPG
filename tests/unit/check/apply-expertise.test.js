import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import TitanCheck from '~/check/Check.js';
import { dice } from './check-test-helpers.js';

describe('_applyExpertise — crafted cases', () => {
   it('raises dice one below difficulty up to difficulty, cheapest first', () => {
      const check = new TitanCheck({
         difficulty: 4,
         totalExpertise: 3,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
      });
      const out = check._applyExpertise(dice([3, 3, 2]));
      expect(out.dice.map((d) => d.final)).toEqual([4, 4, 2]);
      expect(out.expertiseRemaining).toBe(1);
   });

   it('spends expertise to neutralize crit failures when extraFailureOnCritical is set', () => {
      const check = new TitanCheck({
         difficulty: 4,
         totalExpertise: 2,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: true,
      });
      const out = check._applyExpertise(dice([4, 1, 1]));
      expect(out.dice.map((d) => d.final)).toEqual([4, 2, 2]);
      expect(out.expertiseRemaining).toBe(0);
   });
});

describe('_applyExpertise — invariants', () => {
   it('conserves expertise, never lowers a die, and lands raised dice on difficulty/6/2', () => {
      fc.assert(
         fc.property(
            fc.array(fc.integer({ min: 1, max: 6 }), { maxLength: 8 }),
            fc.integer({ min: 0, max: 10 }),
            fc.integer({ min: 2, max: 6 }),
            fc.boolean(),
            fc.boolean(),
            (finals, totalExpertise, difficulty, esoc, efoc) => {
               const check = new TitanCheck({
                  difficulty: difficulty,
                  totalExpertise: totalExpertise,
                  extraSuccessOnCritical: esoc,
                  extraFailureOnCritical: efoc,
               });
               const input = dice(finals);
               const bases = input.map((d) => d.base);
               const out = check._applyExpertise(input);
               const spent = out.dice.reduce((sum, d) => sum + d.expertiseApplied, 0);
               const conserved = spent + out.expertiseRemaining === totalExpertise;
               const nonNegative = out.expertiseRemaining >= 0;
               const neverLowered = out.dice.every((d, i) => d.final >= bases[i]);
               const landed = out.dice.every(
                  (d, i) => d.final === bases[i] || d.final === difficulty || d.final === 6 || d.final === 2,
               );
               return conserved && nonNegative && neverLowered && landed;
            },
         ),
      );
   });
});
