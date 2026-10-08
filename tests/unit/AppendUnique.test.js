import { describe, expect, it } from 'vitest';
import appendUnique from '~/helpers/utility-functions/AppendUnique.js';

describe('appendUnique', () => {
   it('adds the source entries that are missing to the destination array itself', () => {
      /** @type {string[]} The array the caller holds. */
      const destination = ['a'];
      appendUnique(destination, [
         'b',
         'a',
         'c',
      ]);
      expect(destination).toEqual([
         'a',
         'b',
         'c',
      ]);
   });

   it('leaves the source unchanged', () => {
      /** @type {string[]} The source array. */
      const source = ['x'];
      appendUnique([], source);
      expect(source).toEqual(['x']);
   });
});
