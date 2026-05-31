import { describe, expect, it } from 'vitest';
import { expectedCheckResults } from '../../shared/checkOracle.js';

describe('expectedCheckResults oracle', () => {
   it('counts a crit, a normal success, and a crit failure at difficulty 4, complexity 1', () => {
      const result = expectedCheckResults([6, 4, 1], { difficulty: 4, complexity: 1 });
      expect(result).toEqual({
         successes: 2,
         criticalSuccesses: 1,
         criticalFailures: 1,
         succeeded: true,
         extraSuccesses: 1,
         expertiseRemaining: 0,
      });
   });

   it('treats complexity 0 as never-succeeded (attribute/resistance defaults)', () => {
      const result = expectedCheckResults([6], { difficulty: 4, complexity: 0 });
      expect(result).toEqual({
         successes: 1,
         criticalSuccesses: 1,
         criticalFailures: 0,
         succeeded: false,
         extraSuccesses: 0,
         expertiseRemaining: 0,
      });
   });

   it('honors extraSuccessOnCritical and extraFailureOnCritical flags', () => {
      const result = expectedCheckResults([6, 1], {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: true,
         extraFailureOnCritical: true,
      });
      // 6 -> +2, 1 -> -1 => successes 1; one crit-success, one crit-failure.
      expect(result).toEqual({
         successes: 1,
         criticalSuccesses: 1,
         criticalFailures: 1,
         succeeded: true,
         extraSuccesses: 0,
         expertiseRemaining: 0,
      });
   });
});
