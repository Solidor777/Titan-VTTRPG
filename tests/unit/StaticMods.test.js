import { describe, it, expect } from 'vitest';
import { areStaticModsShown } from '~/system/StaticMods.js';

describe('areStaticModsShown', () => {
   it('is false when the actor, its flags or the flag is missing', () => {
      expect(areStaticModsShown(undefined)).toBe(false);
      expect(areStaticModsShown(null)).toBe(false);
      expect(areStaticModsShown({})).toBe(false);
      expect(areStaticModsShown({ flags: {} })).toBe(false);
      expect(areStaticModsShown({ flags: { titan: {} } })).toBe(false);
   });

   it('is true only for the boolean true', () => {
      expect(areStaticModsShown({ flags: { titan: { showStaticMods: true } } })).toBe(true);
      expect(areStaticModsShown({ flags: { titan: { showStaticMods: false } } })).toBe(false);
   });

   it('is false for a stored value that is not a boolean', () => {
      for (const value of [
         'true',
         1,
         {},
         [],
         null,
      ]) {
         expect(areStaticModsShown({ flags: { titan: { showStaticMods: value } } }), String(value)).toBe(false);
      }
   });
});
