import { describe, it, expect } from 'vitest';
import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

describe('deepFreeze', () => {
   it('freezes the objects inside an array, not only the array', () => {
      /** @type {object[]} An array of trait-like objects. */
      const traits = deepFreeze([
         {
            name: 'cleave',
            value: false,
         },
      ]);
      expect(Object.isFrozen(traits)).toBe(true);
      expect(Object.isFrozen(traits[0])).toBe(true);
   });

   it('freezes arrays and objects nested inside an object', () => {
      /** @type {object} A settings-like object with a nested array of options. */
      const settings = deepFreeze({
         range: {
            options: [{ value: 'self' }],
         },
      });
      expect(Object.isFrozen(settings.range)).toBe(true);
      expect(Object.isFrozen(settings.range.options)).toBe(true);
      expect(Object.isFrozen(settings.range.options[0])).toBe(true);
   });
});
