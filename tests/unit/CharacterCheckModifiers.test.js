import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Check-modifier behavior of CharacterDataModel, exercised on a bare instance (Object.create over the prototype) whose
// parent carries only a rules-elements cache and whose roll data is stubbed. The model is imported after the Foundry
// stand-ins are installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

/**
 * Stubbed actor roll data: Body 3; Reflexes 4 and Willpower 2; Athletics and Dexterity with 1 Training.
 * @type {object}
 */
const ROLL_DATA = {
   attribute: {
      body: { value: 3 },
   },
   resistance: {
      reflexes: { value: 4 },
      willpower: { value: 2 },
   },
   skill: {
      athletics: {
         defaultAttribute: 'body',
         expertise: { value: 0 },
         training: { value: 1 },
      },
      dexterity: {
         defaultAttribute: 'body',
         expertise: { value: 0 },
         training: { value: 1 },
      },
   },
};

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
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
 * Creates a bare CharacterDataModel whose parent holds the given rules-elements cache and whose roll data is stubbed.
 * @param {object|boolean} [rulesElementsCache] - The parent's rules-elements cache (`false` when there are none).
 * @returns {object} The model instance.
 */
function createModel(rulesElementsCache = {}) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = { rulesElementsCache };
   model.getRollData = () => structuredClone(ROLL_DATA);
   return model;
}

describe('CharacterDataModel._applyCheckAdvantage', () => {
   it('keeps the pre-Advantage Difficulty and applies the level', () => {
      /** @type {object} Parameters with Disadvantage. */
      const parameters = {
         advantage: -1,
         difficulty: 4,
      };
      createModel()._applyCheckAdvantage(parameters);
      expect(parameters).toEqual({
         advantage: -1,
         baseDifficulty: 4,
         difficulty: 5,
      });
   });

   it('holds a Difficulty at 6 under Disadvantage and at 2 under Advantage', () => {
      /** @type {object} An Attack Check at the Difficulty ceiling. */
      const ceiling = {
         advantage: -1,
         difficulty: 6,
      };
      /** @type {object} An Attack Check at the Difficulty floor. */
      const floor = {
         advantage: 2,
         difficulty: 2,
      };
      createModel()._applyCheckAdvantage(ceiling);
      createModel()._applyCheckAdvantage(floor);
      expect(ceiling.difficulty).toBe(6);
      expect(floor.difficulty).toBe(2);
   });
});

describe('CharacterDataModel.getAttributeCheckParameters — Advantage', () => {
   it('applies the options Advantage after the Difficulty is set', () => {
      /** @type {object} The derived Attribute Check parameters. */
      const parameters = createModel().getAttributeCheckParameters(createAttributeCheckOptions({
         advantage: 2,
         attribute: 'body',
         skill: 'athletics',
      }));
      expect(parameters.baseDifficulty).toBe(4);
      expect(parameters.difficulty).toBe(2);
      expect(parameters.totalDice).toBe(4);
      expect(parameters.situations).toEqual([]);
   });
});

/**
 * Creates a bare model whose every owned item returns the given roll data.
 * @param {object} itemRollData - The roll data each owned item's `system.getRollData()` returns.
 * @returns {object} The model instance.
 */
function createItemModel(itemRollData) {
   /** @type {object} The bare model. */
   const model = createModel();
   model.parent.items = {
      get: () => ({
         system: {
            getRollData: () => structuredClone(itemRollData),
         },
      }),
   };
   return model;
}

describe('Advantage on item-based check parameters', () => {
   it('applies Advantage to an Attack Check after the rating-derived Difficulty is clamped', () => {
      /** @type {object} A weapon with one plain attack. */
      const weaponRollData = {
         attack: [
            {
               customTrait: [],
               damage: 1,
               label: 'x',
               trait: [],
            },
         ],
         attackNotes: '',
         customTrait: [],
         img: '',
         name: 'W',
      };

      // Defense 5 against Melee 0 rates a Difficulty of 9, clamped to 6; Advantage then lowers it to 5.
      /** @type {object} The derived Attack Check parameters. */
      const parameters = createItemModel(weaponRollData).getAttackCheckParameters(createAttackCheckOptions({
         advantage: 1,
         attackerMelee: 0,
         attribute: 'body',
         itemId: 'w',
         skill: 'athletics',
         targetDefense: 5,
         type: 'melee',
      }));
      expect(parameters.baseDifficulty).toBe(6);
      expect(parameters.difficulty).toBe(5);
   });

   it('applies Disadvantage to a Casting Check', () => {
      /** @type {object} A spell with no aspects. */
      const spellRollData = {
         aspect: [],
         customAspect: [],
         customTrait: [],
         description: '',
         img: '',
         name: 'S',
         tradition: '',
      };

      /** @type {object} The derived Casting Check parameters. */
      const parameters = createItemModel(spellRollData).getCastingCheckParameters(createCastingCheckOptions({
         advantage: -1,
         attribute: 'body',
         itemId: 's',
         skill: 'athletics',
      }));
      expect(parameters.baseDifficulty).toBe(4);
      expect(parameters.difficulty).toBe(5);
   });

   it('applies Greater Advantage to an Item Check', () => {
      /** @type {object} An item with one check that deals no damage or healing. */
      const itemRollData = {
         check: [
            {
               isDamage: false,
               isHealing: false,
               label: 'C',
               opposedCheck: {
                  attribute: 'body',
                  enabled: false,
                  skill: 'none',
               },
               resistanceCheck: 'none',
               resolveCost: 0,
            },
         ],
         customTrait: [],
         description: '',
         img: '',
         name: 'I',
      };

      /** @type {object} The derived Item Check parameters. */
      const parameters = createModel().getItemCheckParameters(createItemCheckOptions({
         advantage: 2,
         attribute: 'body',
         difficulty: 4,
         itemRollData,
         skill: 'athletics',
      }));
      expect(parameters.baseDifficulty).toBe(4);
      expect(parameters.difficulty).toBe(2);
   });
});
