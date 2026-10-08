import { describe, expect, it } from 'vitest';
import {
   SET_SUM_MODES,
   SET_SUM_MODE_MAX,
   SET_SUM_MODE_MIN,
   SET_SUM_MODE_SET,
   getSetSumTarget,
} from '~/system/SetSumModes.js';

describe('setSum modes', () => {
   it('names the three modes', () => {
      expect(SET_SUM_MODE_SET).toBe('set');
      expect(SET_SUM_MODE_MIN).toBe('min');
      expect(SET_SUM_MODE_MAX).toBe('max');
   });

   it('lists every mode in the order the rules element editor offers them', () => {
      expect(SET_SUM_MODES).toEqual([
         'set',
         'min',
         'max',
      ]);
      expect(Object.isFrozen(SET_SUM_MODES)).toBe(true);
   });

   it('the set mode takes the value whatever the total', () => {
      expect(getSetSumTarget(5, 3, SET_SUM_MODE_SET)).toBe(3);
      expect(getSetSumTarget(2, 3, SET_SUM_MODE_SET)).toBe(3);
   });

   it('the min mode takes the larger of the total and the value', () => {
      expect(getSetSumTarget(5, 3, SET_SUM_MODE_MIN)).toBe(5);
      expect(getSetSumTarget(2, 3, SET_SUM_MODE_MIN)).toBe(3);
   });

   it('the max mode takes the smaller of the total and the value', () => {
      expect(getSetSumTarget(5, 3, SET_SUM_MODE_MAX)).toBe(3);
      expect(getSetSumTarget(2, 3, SET_SUM_MODE_MAX)).toBe(2);
   });

   it.each([
      undefined,
      'unknown',
      'toString',
   ])('treats %s as the set mode', (mode) => {
      expect(getSetSumTarget(5, 3, mode)).toBe(3);
   });
});
