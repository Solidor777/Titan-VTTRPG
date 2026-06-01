import { describe, it, expect } from 'vitest';
import createMulSumElement from '~/document/types/item/rules-element/MulSum.js';
import createSetSumElement from '~/document/types/item/rules-element/SetSum.js';
import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';

describe('rules-element factory defaults', () => {
   it('createMulSumElement returns the mulSum defaults with a uuid', () => {
      const element = createMulSumElement();
      expect(element).toMatchObject({
         operation: 'mulSum',
         selector: 'speed',
         key: 'stride',
         value: 0.5,
         rounding: 'up',
      });
      expect(typeof element.uuid).toBe('string');
      expect(element.uuid.length).toBeGreaterThan(0);
   });

   it('createSetSumElement returns the setSum defaults with a uuid', () => {
      const element = createSetSumElement();
      expect(element).toMatchObject({
         operation: 'setSum',
         selector: 'speed',
         key: 'stride',
         value: 0,
         mode: 'set',
      });
      expect(typeof element.uuid).toBe('string');
      expect(element.uuid.length).toBeGreaterThan(0);
   });

   it('createMulBaseElement defaults rounding to down', () => {
      const element = createMulBaseElement();
      expect(element).toMatchObject({
         operation: 'mulBase',
         selector: 'attribute',
         key: 'body',
         value: 2,
         rounding: 'down',
      });
      expect(typeof element.uuid).toBe('string');
   });

   it('preserves a provided uuid', () => {
      expect(createMulSumElement({ uuid: 'fixed-uuid' }).uuid).toBe('fixed-uuid');
      expect(createSetSumElement({ uuid: 'fixed-uuid' }).uuid).toBe('fixed-uuid');
      expect(createMulBaseElement({ uuid: 'fixed-uuid' }).uuid).toBe('fixed-uuid');
   });
});
