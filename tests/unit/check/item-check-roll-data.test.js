import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createItemCheckRollData from '~/check/types/item-check/ItemCheckRollData.js';
import { installSchemaMocks, restoreSchemaMocks } from '../helpers/schemaFingerprint.js';

// The snapshot feeds the real Item Check readers of a bare CharacterDataModel (Object.create over the prototype), so
// a field those readers need and the snapshot lacks fails here without a list of fields to maintain.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

/**
 * An item chat card's plain system data, as its data model's `toObject()` returns it.
 * @type {object}
 */
const CARD_ITEM = {
   check: [
      {
         attribute: 'body',
         complexity: 1,
         damageReducedBy: 'none',
         difficulty: 4,
         initialValue: 2,
         isDamage: true,
         isHealing: false,
         label: 'Card Check',
         opposedCheck: {
            attribute: 'mind',
            enabled: false,
            skill: 'perception',
         },
         resistanceCheck: 'none',
         resolveCost: 1,
         scaling: false,
         skill: 'athletics',
         uuid: 'card-check',
      },
   ],
   customTrait: [{ name: 'Glowing' }],
   description: '<p>An item.</p>',
   img: 'item.svg',
   name: 'Card Item',
   rarity: 'common',
   rulesElement: [],
};

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.game.titan = {
      error: vi.fn(),
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Builds a stand-in for the chat message's live system data model over the card's data.
 * @returns {object} The model; its `toObject()` returns a fresh copy of `CARD_ITEM`.
 */
function createCardModel() {
   return {
      check: CARD_ITEM.check,

      /**
       * Returns the model's plain source data.
       * @returns {object} A structured clone of `CARD_ITEM`.
       */
      toObject: () => structuredClone(CARD_ITEM),
   };
}

describe('createItemCheckRollData', () => {
   it('deep-copies the whole plain data of a data model', () => {
      /** @type {object} The chat card's live data model. */
      const model = createCardModel();

      /** @type {object} The snapshot. */
      const rollData = createItemCheckRollData(model);
      expect(rollData).toEqual(CARD_ITEM);
      expect(Object.getPrototypeOf(rollData)).toBe(Object.prototype);
      expect(rollData.check).not.toBe(model.check);
      expect(rollData.check[0].opposedCheck).not.toBe(CARD_ITEM.check[0].opposedCheck);
   });

   it('deep-copies plain data that has no toObject', () => {
      /** @type {object} The snapshot of the card's plain data. */
      const rollData = createItemCheckRollData(CARD_ITEM);
      expect(rollData).toEqual(CARD_ITEM);
      expect(rollData.customTrait[0]).not.toBe(CARD_ITEM.customTrait[0]);
   });

   it('carries every field the Item Check readers use', () => {
      /** @type {object} A bare Character whose Body is 2 and whose Athletics is untrained. */
      const system = Object.create(CharacterDataModel.prototype);
      system.parent = { rulesElementsCache: {} };
      system.getRollData = () => ({
         attribute: {
            body: { value: 2 },
         },
         skill: {
            athletics: {
               defaultAttribute: 'body',
               expertise: { value: 0 },
               training: { value: 0 },
            },
         },
      });

      /** @type {object} The request a chat card's check button makes. */
      const options = {
         checkIdx: 0,
         itemRollData: createItemCheckRollData(createCardModel()),
      };
      expect(system.validateItemCheckOptions(options)).toBe(true);

      /** @type {object} The Item Check parameters derived from the snapshot. */
      const parameters = system.getItemCheckParameters(system.initializeItemCheckOptions(options));
      expect(parameters).toMatchObject({
         checkLabel: 'Card Check',
         customTrait: [{ name: 'Glowing' }],
         damage: 2,
         difficulty: 4,
         img: 'item.svg',
         itemDescription: '<p>An item.</p>',
         itemName: 'Card Item',
         resolveCost: 1,
         totalDice: 2,
      });
   });
});
