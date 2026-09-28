import { describe, expect, it } from 'vitest';
import computeDamageResistance from '../../src/helpers/utility-functions/ComputeDamageResistance.js';

describe('computeDamageResistance', () => {
   it('resists damage equal to the Armor with no options', () => {
      expect(computeDamageResistance(4)).toBe(4);
      expect(computeDamageResistance(4, {})).toBe(4);
   });

   it('resists nothing when the damage ignores Armor', () => {
      expect(computeDamageResistance(4, { ignoreArmor: true })).toBe(0);
      expect(computeDamageResistance(4, {
         ignoreArmor: true,
         penetrating: true,
      })).toBe(0);
   });

   it('Penetrating ignores half the Armor, the remaining Armor rounding up', () => {
      expect([
         1,
         2,
         3,
         4,
         5,
         6,
      ].map((armor) => computeDamageResistance(armor, { penetrating: true }))).toEqual([
         1,
         1,
         2,
         2,
         3,
         3,
      ]);
   });

   it('Ineffective doubles the Armor before Penetrating halves it', () => {
      expect(computeDamageResistance(3, { ineffective: true })).toBe(6);
      expect(computeDamageResistance(3, {
         ineffective: true,
         penetrating: true,
      })).toBe(3);
   });

   it('never resists with no Armor', () => {
      expect(computeDamageResistance(0, { ineffective: true })).toBe(0);
      expect(computeDamageResistance(-1)).toBe(0);
   });
});
