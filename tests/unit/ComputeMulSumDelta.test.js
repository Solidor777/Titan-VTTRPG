import { describe, it, expect } from 'vitest';
import computeMulSumDelta from '~/helpers/utility-functions/ComputeMulSumDelta.js';

describe('computeMulSumDelta', () => {
   it('halves a positive total rounding up, returning the corrective delta', () => {
      expect(computeMulSumDelta(5, 0.5, 'up')).toBe(-2);
   });

   it('halves a positive total rounding down', () => {
      expect(computeMulSumDelta(5, 0.5, 'down')).toBe(-3);
   });

   it('is a no-op for an even total regardless of rounding', () => {
      expect(computeMulSumDelta(6, 0.5, 'up')).toBe(-3);
      expect(computeMulSumDelta(6, 0.5, 'down')).toBe(-3);
   });

   it('returns 0 when the total is zero or negative (guard)', () => {
      expect(computeMulSumDelta(0, 0.5, 'up')).toBe(0);
      expect(computeMulSumDelta(-4, 0.5, 'up')).toBe(0);
   });

   it('supports multipliers greater than one', () => {
      expect(computeMulSumDelta(3, 2, 'down')).toBe(3);
   });
});
