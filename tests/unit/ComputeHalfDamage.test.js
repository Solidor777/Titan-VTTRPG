import { describe, expect, it } from 'vitest';
import computeHalfDamage from '~/helpers/utility-functions/ComputeHalfDamage.js';

describe('computeHalfDamage', () => {
   it.each([
      [
         1,
         1,
      ],
      [
         2,
         1,
      ],
      [
         3,
         1,
      ],
      [
         7,
         3,
      ],
      [
         8,
         4,
      ],
   ])('half of %i damage is %i', (damage, expected) => {
      expect(computeHalfDamage(damage)).toBe(expected);
   });

   it.each([
      0,
      -3,
      undefined,
   ])('a card with %s damage applies none', (damage) => {
      expect(computeHalfDamage(damage)).toBe(0);
   });
});
