import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import camelize from '~/helpers/utility-functions/Camelize.js';

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
         difficulty: 4,
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

/**
 * Builds a conditional check modifier element tagged with its source name, as `_applyRulesElements` passes it on.
 * @param {object} overrides - Fields replacing the defaults (any check type, any selector, Dice +1).
 * @returns {object} The element.
 */
function checkModifier(overrides) {
   return {
      checkType: 'any',
      key: '',
      modifierType: 'dice',
      operation: 'conditionalCheckModifier',
      selector: 'any',
      skill: '',
      sourceName: 'Source',
      value: 1,
      ...overrides,
   };
}

/**
 * Builds a model whose cache holds the given situational elements.
 * @param {object[]} elements - The situational elements.
 * @returns {object} The model instance.
 */
function situationalModel(elements) {
   /** @type {object} The model under test. */
   const model = createModel();
   model._applySituationalCheckModifierElements(elements);
   return model;
}

describe('conditional check modifier cache — Advantage and Automatic Failure', () => {
   it('sums mixed Advantage levels per check type, selector, and key', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'advantage',
            value: 2,
         }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
         checkModifier({
            key: 'athletics',
            modifierType: 'advantage',
            selector: 'skill',
            value: 1,
         }),
      ]);
      expect(model.getAttributeCheckMod('advantage', 'body', 'athletics')).toBe(2);
      expect(model.getAttributeCheckMod('advantage', 'body', 'dexterity')).toBe(1);
   });

   it('nets opposing sources to no Advantage and leaves the Difficulty unchanged', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'advantage',
            value: 1,
         }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {object} The initialized Attribute Check options. */
      const options = model.initializeAttributeCheckOptions({
         attribute: 'body',
         skill: 'athletics',
      });
      expect(options.advantage).toBe(0);
      expect(model.getAttributeCheckParameters(options).difficulty).toBe(4);
   });

   it('counts an Automatic Failure element as 1 whatever its stored value', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'automaticFailure',
            value: 0,
         }),
      ]);
      expect(model.getAttributeCheckMod('automaticFailure', 'body', 'none')).toBe(1);
   });

   it('initializes Attribute Check options from the cache unless they are provided', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
         checkModifier({
            modifierType: 'automaticFailure',
         }),
      ]);
      expect(model.initializeAttributeCheckOptions({
         attribute: 'body',
         skill: 'athletics',
      })).toMatchObject({
         advantage: -1,
         automaticFailure: true,
      });
      expect(model.initializeAttributeCheckOptions({
         advantage: 2,
         attribute: 'body',
         automaticFailure: false,
         skill: 'athletics',
      })).toMatchObject({
         advantage: 2,
         automaticFailure: false,
      });
   });
});

describe('situational check modifiers', () => {
   it('offers a check its own type and any, filtered to the modifier types it reads', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Underwater',
            selector: 'situation',
            sourceName: 'Pool',
            value: -1,
         }),
         checkModifier({
            checkType: 'casting',
            key: 'Chanting',
            selector: 'situation',
         }),
         checkModifier({
            key: 'Charging',
            modifierType: 'damage',
            selector: 'situation',
         }),
         checkModifier({
            checkType: 'resistance',
            key: 'Braced',
            modifierType: 'advantage',
            selector: 'situation',
         }),
      ]);
      /**
       * Lists the offered keys for a check type.
       * @param {string} checkType - The check type.
       * @returns {string[]} The offered situation keys.
       */
      const keysFor = (checkType) => model.getSituationalCheckModifiers(checkType, { skill: 'athletics' })
         .map((modifier) => modifier.key);
      expect(keysFor('attribute')).toEqual(['underwater']);
      expect(keysFor('casting')).toEqual([
         'underwater',
         'chanting',
         'charging',
      ]);
      expect(keysFor('resistance')).toEqual([
         'underwater',
         'braced',
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })[0]).toEqual({
         key: 'underwater',
         label: 'Underwater',
         modifierType: 'dice',
         sources: ['Pool'],
         value: -1,
      });
   });

   it('offers an element narrowed to a Skill only on checks using that Skill', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Jump',
            modifierType: 'automaticFailure',
            selector: 'situation',
            skill: 'athletics',
         }),
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toHaveLength(1);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'dexterity' })).toHaveLength(0);
      expect(model.getSituationalCheckModifiers('resistance')).toHaveLength(0);
   });

   it('sums one key and modifier type across sources and lists every source once', () => {
      /** @type {string} A situation label shared by several sources. */
      const label = 'Swim, Fly, or Climb';
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: label,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Plate',
            value: -2,
         }),
         checkModifier({
            key: label,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Plate',
            value: -1,
         }),
         checkModifier({
            key: label,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Cloak',
            value: -1,
         }),
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([
         {
            key: camelize(label),
            label,
            modifierType: 'advantage',
            sources: [
               'Plate',
               'Cloak',
            ],
            value: -4,
         },
      ]);
   });

   it('adds ticked situations on top of the options without double counting', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Underwater',
            selector: 'situation',
            value: -1,
         }),
         checkModifier({
            key: 'Underwater',
            modifierType: 'advantage',
            selector: 'situation',
            value: -1,
         }),
      ]);
      /** @type {object} Options with the situation ticked. */
      const options = createAttributeCheckOptions({
         attribute: 'body',
         situations: ['underwater'],
         skill: 'athletics',
      });
      /** @type {object} The parameters with the situation ticked. */
      const ticked = model.getAttributeCheckParameters(options);
      /** @type {object} The parameters after unticking it. */
      const unticked = model.getAttributeCheckParameters({
         ...options,
         situations: [],
      });
      /** @type {object} The parameters after ticking it again. */
      const reticked = model.getAttributeCheckParameters(options);

      expect(options.diceMod).toBe(0);
      expect(options.advantage).toBe(0);
      expect(ticked).toMatchObject({
         advantage: -1,
         diceMod: -1,
         difficulty: 5,
         situations: [
            {
               key: 'underwater',
               label: 'Underwater',
            },
         ],
         totalDice: 3,
      });
      expect(unticked).toMatchObject({
         advantage: 0,
         diceMod: 0,
         difficulty: 4,
         situations: [],
         totalDice: 4,
      });
      expect(reticked).toEqual(ticked);
   });

   it('ignores a ticked situation that no longer applies to the check\'s Skill', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Jump',
            modifierType: 'automaticFailure',
            selector: 'situation',
            skill: 'athletics',
         }),
      ]);
      /** @type {object} Dexterity-check parameters with the Athletics-only situation ticked. */
      const parameters = model.getAttributeCheckParameters(createAttributeCheckOptions({
         attribute: 'body',
         situations: ['jump'],
         skill: 'dexterity',
      }));
      expect(parameters.automaticFailure).toBe(false);
      expect(parameters.situations).toEqual([]);
   });

   it('offers nothing when the actor has no rules elements', () => {
      expect(createModel(false).getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([]);
   });

   it('applies an attack-type situational element through getAttackCheckParameters, excluded from Attribute', () => {
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

      /** @type {object} The model under test, carrying both the weapon and the situational cache. */
      const model = createItemModel(weaponRollData);
      model._applySituationalCheckModifierElements([
         checkModifier({
            checkType: 'attack',
            key: 'Flanking',
            modifierType: 'advantage',
            selector: 'situation',
            value: 1,
         }),
      ]);

      // Not offered to an Attribute Check: the element's checkType is 'attack', not 'any'.
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([]);

      /** @type {object} The derived Attack Check parameters with the situation ticked. */
      const parameters = model.getAttackCheckParameters(createAttackCheckOptions({
         attackerMelee: 0,
         attribute: 'body',
         itemId: 'w',
         situations: ['flanking'],
         skill: 'athletics',
         targetDefense: 5,
         type: 'melee',
      }));
      expect(parameters.advantage).toBe(1);
      expect(parameters.situations).toEqual([
         {
            key: 'flanking',
            label: 'Flanking',
         },
      ]);
   });
});

describe('Resistance Check conditional modifiers', () => {
   /**
    * Builds a model caching the Resistance-relevant and irrelevant Dice penalties used below.
    * @returns {object} The model instance.
    */
   function resistanceModel() {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            value: -1,
         }),
         checkModifier({
            checkType: 'resistance',
            value: -1,
         }),
         checkModifier({
            checkType: 'resistance',
            key: 'reflexes',
            selector: 'resistance',
            value: -2,
         }),
         checkModifier({
            key: 'body',
            selector: 'attribute',
            value: -5,
         }),
         checkModifier({
            key: 'athletics',
            selector: 'skill',
            value: -7,
         }),
      ]);
      return model;
   }

   it('reads any/any, resistance/any, and resistance keyed by the rolled Resistance, never attribute or skill', () => {
      /** @type {object} The model under test. */
      const model = resistanceModel();
      expect(model.getResistanceCheckMod('dice', 'reflexes')).toBe(-4);
      expect(model.getResistanceCheckMod('dice', 'willpower')).toBe(-2);
   });

   it('initializes Resistance Check options from the cache unless they are provided', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            value: -1,
         }),
         checkModifier({
            checkType: 'resistance',
            key: 'reflexes',
            modifierType: 'automaticFailure',
            selector: 'resistance',
         }),
         checkModifier({
            modifierType: 'expertise',
            value: 2,
         }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      expect(model.initializeResistanceCheckOptions({ resistance: 'reflexes' })).toMatchObject({
         advantage: -1,
         automaticFailure: true,
         diceMod: -1,
         expertiseMod: 2,
      });
      expect(model.initializeResistanceCheckOptions({ resistance: 'willpower' }).automaticFailure).toBe(false);
      expect(model.initializeResistanceCheckOptions({
         diceMod: 3,
         resistance: 'reflexes',
      }).diceMod).toBe(3);
   });

   it('applies ticked situations and Advantage to the Resistance Check parameters', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            checkType: 'resistance',
            key: 'Braced',
            selector: 'situation',
            value: 1,
         }),
      ]);
      /** @type {object} Reflexes-check parameters with Advantage and the situation ticked. */
      const parameters = model.getResistanceCheckParameters(createResistanceCheckOptions({
         advantage: 1,
         resistance: 'reflexes',
         situations: ['braced'],
      }));
      expect(parameters).toMatchObject({
         baseDifficulty: 4,
         diceMod: 1,
         difficulty: 3,
         resistanceDice: 4,
         totalDice: 5,
      });
   });
});

describe('CharacterDataModel._expandAllKeyElements', () => {
   it('keeps a situation labelled "all" as a literal label instead of expanding or dropping it', () => {
      /** @type {object} A situation element whose typed label is the reserved word. */
      const situation = checkModifier({
         key: 'all',
         selector: 'situation',
      });
      expect(createModel()._expandAllKeyElements([situation])).toEqual([situation]);
   });

   it('still expands an "all" key under a stat selector into one element per key', () => {
      /** @type {object} The model under test, with two attributes. */
      const model = createModel();
      model.attribute = {
         body: {},
         mind: {},
      };
      expect(model._expandAllKeyElements([
         checkModifier({
            key: 'all',
            selector: 'attribute',
         }),
      ]).map((element) => element.key)).toEqual([
         'body',
         'mind',
      ]);
   });
});

describe('CharacterDataModel._expandAllKeyElements — user-typed keys', () => {
   it.each([
      [
         'conditionalCheckModifier',
         'customTrait',
      ],
      [
         'conditionalCheckModifier',
         'spellTradition',
      ],
      [
         'conditionalRatingModifier',
         'customArmorTrait',
      ],
      [
         'conditionalRatingModifier',
         'customWeaponTrait',
      ],
      [
         'conditionalRatingModifier',
         'customShieldTrait',
      ],
      [
         'rollMessage',
         'customTrait',
      ],
   ])('keeps a %s element with a typed %s key "all" as a literal key', (operation, selector) => {
      /** @type {object} An element whose typed key is the reserved word. */
      const element = {
         key: 'all',
         operation,
         selector,
      };
      expect(createModel()._expandAllKeyElements([element])).toEqual([element]);
   });
});
