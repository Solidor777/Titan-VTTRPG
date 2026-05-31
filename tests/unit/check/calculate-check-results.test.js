import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import calculateCheckResults from '~/check/CheckResults.js';
import { diceResults, expectedSuccesses } from './check-test-helpers.js';

describe('calculateCheckResults — crafted cases', () => {
   it('counts normal successes, one crit success, one crit failure (flags off)', () => {
      const params = {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
      };
      const r = calculateCheckResults(diceResults([6, 5, 4, 3, 2, 1]), params);
      expect(r.successes).toBe(3);
      expect(r.criticalSuccesses).toBe(1);
      expect(r.criticalFailures).toBe(1);
      expect(r.succeeded).toBe(true);
      expect(r.extraSuccesses).toBe(1);
   });

   it('doubles a crit success when extraSuccessOnCritical is set', () => {
      const params = {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: true,
         extraFailureOnCritical: false,
      };
      const r = calculateCheckResults(diceResults([6, 5, 4, 3, 2, 1]), params);
      expect(r.successes).toBe(4);
      expect(r.extraSuccesses).toBe(2);
   });

   it('subtracts a success per crit failure when extraFailureOnCritical is set', () => {
      const params = {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: true,
      };
      const r = calculateCheckResults(diceResults([6, 5, 4, 1, 1]), params);
      expect(r.successes).toBe(1);
      expect(r.criticalFailures).toBe(2);
      expect(r.succeeded).toBe(false);
      expect(r.extraSuccesses).toBe(0);
   });

   it('never marks success when complexity is 0', () => {
      const params = {
         difficulty: 4,
         complexity: 0,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
      };
      const r = calculateCheckResults(diceResults([6, 6, 6]), params);
      expect(r.successes).toBe(3);
      expect(r.succeeded).toBe(false);
   });
});

describe('calculateCheckResults — properties', () => {
   it('successes match the oracle; succeeded and extraSuccesses follow the rules', () => {
      fc.assert(
         fc.property(
            fc.array(fc.integer({ min: 1, max: 6 }), { maxLength: 10 }),
            fc.integer({ min: 2, max: 6 }),
            fc.integer({ min: 0, max: 6 }),
            fc.boolean(),
            fc.boolean(),
            (finals, difficulty, complexity, esoc, efoc) => {
               const params = {
                  difficulty: difficulty,
                  complexity: complexity,
                  extraSuccessOnCritical: esoc,
                  extraFailureOnCritical: efoc,
               };
               const r = calculateCheckResults(diceResults(finals), params);
               const expected = expectedSuccesses(finals, params);
               const succeeded = complexity > 0 ? expected >= complexity : false;
               const extra = complexity > 0 && expected > complexity ? expected - complexity : 0;
               return r.successes === expected && r.succeeded === succeeded && r.extraSuccesses === extra;
            },
         ),
      );
   });
});
