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

   it('defaults to floor when rounding is missing or unrecognized', () => {
      expect(roundDirectional(2.9, undefined)).toBe(2);
      expect(roundDirectional(2.9, 'sideways')).toBe(2);
   });

   it('leaves integers unchanged in both directions', () => {
      expect(roundDirectional(4, 'up')).toBe(4);
      expect(roundDirectional(4, 'down')).toBe(4);
   });
});
