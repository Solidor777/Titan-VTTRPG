import { describe, it, expect } from 'vitest';
import moveArrayEntry from '~/helpers/utility-functions/MoveArrayEntry.js';

describe('moveArrayEntry', () => {
   it('moves an entry forward using insertion-point semantics (toIdx = slot before move)', () => {
      // 'a' moved to insertion point 3 lands before original index 3 ('d').
      expect(moveArrayEntry(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'a', 'd']);
   });

   it('moves an entry backward', () => {
      expect(moveArrayEntry(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd']);
   });

   it('treats toIdx at array length as "append"', () => {
      expect(moveArrayEntry(['a', 'b', 'c'], 0, 3)).toEqual(['b', 'c', 'a']);
   });

   it('is a no-op when the entry is dropped onto its own boundary', () => {
      expect(moveArrayEntry(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
      expect(moveArrayEntry(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'b', 'c']);
   });

   it('does not mutate the input array', () => {
      const input = ['a', 'b', 'c'];
      moveArrayEntry(input, 0, 2);
      expect(input).toEqual(['a', 'b', 'c']);
   });
});
