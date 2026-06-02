import { describe, it, expect } from 'vitest';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';

describe('createItemCheckOptions', () => {
   it('defaults an absent itemRollData to undefined rather than the literal false', () => {
      // The key parity assertion: an absent itemRollData must be a true "absent" (undefined),
      // so that `??` and `||` consumers behave identically.
      expect(createItemCheckOptions({}).itemRollData).toBe(undefined);
   });

   it('preserves a supplied itemRollData object by reference (passthrough)', () => {
      // A supplied roll-data object must survive untouched so callers read the real data.
      const someObject = {
         check: [],
      };
      expect(createItemCheckOptions({ itemRollData: someObject }).itemRollData).toBe(someObject);
   });

   it('locks the default shape for the core scalar options', () => {
      // A sampling of defaults to guard the returned shape against accidental drift.
      const options = createItemCheckOptions({});
      expect(options.attribute).toBe('default');
      expect(options.checkIdx).toBe(0);
      expect(options.itemId).toBe('');
   });
});
