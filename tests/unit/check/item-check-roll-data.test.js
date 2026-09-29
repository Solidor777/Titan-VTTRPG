import { describe, it, expect } from 'vitest';
import createItemCheckRollData from '~/check/types/item-check/ItemCheckRollData.js';

describe('createItemCheckRollData', () => {
   it('copies exactly the fields an Item Check reads from a data model into plain data', () => {
      /** @type {object} The model's plain source, as its `toObject` returns it. */
      const source = {
         check: [{ difficulty: 4 }],
         customTrait: [{ name: 'Glowing' }],
         description: '<p>An item.</p>',
         img: 'item.svg',
         name: 'Card Item',
         rarity: 'common',
      };

      /** @type {object} A stand-in for the chat message's live system data model. */
      const model = {
         check: source.check,
         /**
          * Returns the model's plain source data.
          * @returns {object} A structured clone of `source`.
          */
         toObject: () => structuredClone(source),
      };

      /** @type {object} The snapshot. */
      const rollData = createItemCheckRollData(model);
      expect(rollData).toEqual({
         check: [{ difficulty: 4 }],
         customTrait: [{ name: 'Glowing' }],
         description: '<p>An item.</p>',
         img: 'item.svg',
         name: 'Card Item',
      });
      expect(Object.getPrototypeOf(rollData)).toBe(Object.prototype);
      expect(rollData.check).not.toBe(model.check);
   });
});
