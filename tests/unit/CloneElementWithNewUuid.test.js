import { describe, it, expect } from 'vitest';
import cloneElementWithNewUuid from '~/helpers/utility-functions/CloneElementWithNewUuid.js';

describe('cloneElementWithNewUuid', () => {
   it('returns a deep copy whose uuid differs from the source', () => {
      const source = { operation: 'flatModifier', value: 3, uuid: 'original-uuid' };
      const clone = cloneElementWithNewUuid(source);

      expect(clone.operation).toBe('flatModifier');
      expect(clone.value).toBe(3);
      expect(clone.uuid).not.toBe('original-uuid');
      expect(typeof clone.uuid).toBe('string');
      expect(clone.uuid.length).toBeGreaterThan(0);
   });

   it('does not mutate or alias the source (deep copy)', () => {
      const source = { nested: { list: [1, 2] }, uuid: 'a' };
      const clone = cloneElementWithNewUuid(source);
      clone.nested.list.push(3);

      expect(source.nested.list).toEqual([1, 2]);
      expect(source.uuid).toBe('a');
   });
});
