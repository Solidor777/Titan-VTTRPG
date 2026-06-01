import { describe, it, expect } from 'vitest';
import computeSetSumDelta from '~/helpers/utility-functions/ComputeSetSumDelta.js';

describe('computeSetSumDelta', () => {
   it('set mode forces the total to the value', () => {
      expect(computeSetSumDelta(5, 0, 'set')).toBe(-5);
      expect(computeSetSumDelta(2, 4, 'set')).toBe(2);
   });

   it('min mode raises the total to a floor but never lowers it', () => {
      expect(computeSetSumDelta(2, 5, 'min')).toBe(3);
      expect(computeSetSumDelta(8, 5, 'min')).toBe(0);
   });

   it('max mode caps the total but never raises it', () => {
      expect(computeSetSumDelta(8, 5, 'max')).toBe(-3);
      expect(computeSetSumDelta(2, 5, 'max')).toBe(0);
   });

   it('defaults to set mode for an unknown mode', () => {
      expect(computeSetSumDelta(5, 0, undefined)).toBe(-5);
   });
});
