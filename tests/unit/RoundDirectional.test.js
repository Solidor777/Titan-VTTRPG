import { describe, it, expect } from 'vitest';
import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';

describe('roundDirectional', () => {
   it('rounds up with ceil when rounding is "up"', () => {
      expect(roundDirectional(2.5, 'up')).toBe(3);
      expect(roundDirectional(-0.5, 'up')).toBe(-0);
   });

   it('rounds down with floor when rounding is "down"', () => {
      expect(roundDirectional(2.5, 'down')).toBe(2);
      expect(roundDirectional(-0.5, 'down')).toBe(-1);
   });

   it('rounds to the nearest integer, a half toward positive infinity, when rounding is "nearest"', () => {
      expect(roundDirectional(2.4, 'nearest')).toBe(2);
      expect(roundDirectional(2.5, 'nearest')).toBe(3);
      expect(roundDirectional(-1.5, 'nearest')).toBe(-1);
      expect(roundDirectional(-1.6, 'nearest')).toBe(-2);
   });

   it('defaults to floor when rounding is missing or unrecognized', () => {
      expect(roundDirectional(2.9, undefined)).toBe(2);
      expect(roundDirectional(2.9, 'sideways')).toBe(2);
   });

   it('leaves integers unchanged in both directions', () => {
      expect(roundDirectional(4, 'up')).toBe(4);
      expect(roundDirectional(4, 'down')).toBe(4);
   });
});
