import { describe, it, expect } from 'vitest';
import computeSetSumDelta from '~/helpers/utility-functions/ComputeSetSumDelta.js';
import { SET_SUM_MODE_MAX, SET_SUM_MODE_MIN, SET_SUM_MODE_SET } from '~/system/SetSumModes.js';

describe('computeSetSumDelta', () => {
   it('set mode forces the total to the value', () => {
      expect(computeSetSumDelta(5, 0, SET_SUM_MODE_SET)).toBe(-5);
      expect(computeSetSumDelta(2, 4, SET_SUM_MODE_SET)).toBe(2);
   });

   it('min mode raises the total to a floor but never lowers it', () => {
      expect(computeSetSumDelta(2, 5, SET_SUM_MODE_MIN)).toBe(3);
      expect(computeSetSumDelta(8, 5, SET_SUM_MODE_MIN)).toBe(0);
   });

   it('max mode caps the total but never raises it', () => {
      expect(computeSetSumDelta(8, 5, SET_SUM_MODE_MAX)).toBe(-3);
      expect(computeSetSumDelta(2, 5, SET_SUM_MODE_MAX)).toBe(0);
   });

   it('defaults to set mode for an unknown mode', () => {
      expect(computeSetSumDelta(5, 0, undefined)).toBe(-5);
   });
});
