import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import camelize from '~/helpers/utility-functions/Camelize.js';
import { TYPED_KEY_SELECTORS } from '~/system/ConditionalCheckModifierTypes.js';

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

/** @type {object} A weapon with one plain Body (Athletics) melee attack. */
const WEAPON_ROLL_DATA = {
   attack: [
      {
         attribute: 'body',
         customTrait: [],
         damage: 1,
         label: 'x',
         plusExtraSuccessDamage: false,
         range: 1,
         skill: 'athletics',
         trait: [],
         type: 'melee',
      },
   ],
   attackNotes: '',
   customTrait: [],
   img: '',
   multiAttack: false,
   name: 'W',
};

/** @type {object} A spell with a Body (Athletics) 4:1 Casting Check and no aspects. */
const SPELL_ROLL_DATA = {
   aspect: [],
   castingCheck: {
      attribute: 'body',
      complexity: 1,
      difficulty: 4,
      skill: 'athletics',
   },
   customAspect: [],
   customTrait: [],
   description: '',
   img: '',
   name: 'S',
   tradition: '',
};

/** @type {object} An item with one Body (Athletics) 4:1 check that deals no damage or healing. */
const ITEM_ROLL_DATA = {
   check: [
      {
         attribute: 'body',
         complexity: 1,
         difficulty: 4,
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
         skill: 'athletics',
      },
   ],
   customTrait: [],
   description: '',
   img: '',
   name: 'I',
};

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
 * @param {object[]} elements - Conditional Check Modifier elements with the `situation` selector to cache.
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
       * @param {string} checkType - The check type to query (e.g. `attribute` or `casting`).
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

   it('lists a system situation under its canonical key with its localized label, merged with a typed one', () => {
      /** @type {string} The canonical source string of a system situation. */
      const canonical = 'Swim, Fly, or Climb';
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: canonical,
            label: 'Nadar, Volar o Trepar',
            labelKey: 'situationSwimFlyClimb',
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Plate',
            value: -2,
         }),
         checkModifier({
            key: canonical,
            modifierType: 'advantage',
            selector: 'situation',
            sourceName: 'Cloak',
            value: -1,
         }),
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([
         {
            key: camelize(canonical),
            label: 'Nadar, Volar o Trepar',
            labelKey: 'situationSwimFlyClimb',
            modifierType: 'advantage',
            sources: [
               'Plate',
               'Cloak',
            ],
            value: -3,
         },
      ]);
   });

   it('records the labelKey of a system situation on the applied situation, and none for a typed one', () => {
      /** @type {object} The model under test. */
      const model = situationalModel([
         checkModifier({
            key: 'Jump',
            label: 'Saltar',
            labelKey: 'situationJump',
            modifierType: 'automaticFailure',
            selector: 'situation',
         }),
         checkModifier({
            key: 'Underwater',
            modifierType: 'advantage',
            selector: 'situation',
            value: -1,
         }),
      ]);
      /** @type {object} The parameters the situations are applied to. */
      const parameters = {
         advantage: 0,
         automaticFailure: false,
         skill: 'athletics',
      };
      model._applySituationalModifiers(parameters, 'attribute', [
         'jump',
         'underwater',
      ]);
      expect(parameters.situations).toEqual([
         {
            key: 'jump',
            label: 'Saltar',
            labelKey: 'situationJump',
         },
         {
            key: 'underwater',
            label: 'Underwater',
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

   it('reports an unknown check type by name and offers nothing, with or without situational elements', () => {
      /** @type {Function} The stubbed error notification. */
      const notify = vi.fn();
      globalThis.ui = { notifications: { error: notify } };
      vi.spyOn(console, 'assert').mockImplementation(() => {});
      try {
         /** @type {object} A cache holding one situational element. */
         const cache = {
            situationalCheckModifier: [
               {
                  checkType: 'any',
                  key: 'underwater',
                  label: 'Underwater',
                  modifierType: 'dice',
                  skill: '',
                  source: 'Effect',
                  value: -1,
               },
            ],
         };
         expect(createModel(cache).getSituationalCheckModifiers('spellcasting')).toEqual([]);
         expect(createModel(false).getSituationalCheckModifiers('spellcasting')).toEqual([]);
         expect(notify).toHaveBeenCalledTimes(2);
         expect(notify).toHaveBeenCalledWith(expect.stringContaining('Unknown check type "spellcasting"'));
      }
      finally {
         delete globalThis.ui;
         vi.restoreAllMocks();
      }
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

   it('applies a casting-type situation through getCastingCheckParameters and not to an Item Check', () => {
      /** @type {object} The model under test, carrying a spell and a casting-type situation. */
      const model = createItemModel(SPELL_ROLL_DATA);
      model._applySituationalCheckModifierElements([
         checkModifier({
            checkType: 'casting',
            key: 'Chanting',
            selector: 'situation',
            value: 2,
         }),
      ]);

      /** @type {object} The derived Casting Check parameters with the situation ticked. */
      const casting = model.getCastingCheckParameters(createCastingCheckOptions({
         attribute: 'body',
         difficulty: 4,
         itemId: 's',
         situations: ['chanting'],
         skill: 'athletics',
      }));
      expect(casting.diceMod).toBe(2);
      expect(casting.situations).toEqual([
         {
            key: 'chanting',
            label: 'Chanting',
         },
      ]);

      /** @type {object} The derived Item Check parameters with the same situation ticked. */
      const item = model.getItemCheckParameters(createItemCheckOptions({
         attribute: 'body',
         difficulty: 4,
         itemRollData: ITEM_ROLL_DATA,
         situations: ['chanting'],
         skill: 'athletics',
      }));
      expect(item.diceMod).toBe(0);
      expect(item.situations).toEqual([]);
   });

   it('applies an item-type situation through getItemCheckParameters and not to a Casting Check', () => {
      /** @type {object} The model under test, carrying a spell and an item-type situation. */
      const model = createItemModel(SPELL_ROLL_DATA);
      model._applySituationalCheckModifierElements([
         checkModifier({
            checkType: 'item',
            key: 'Darkness',
            modifierType: 'advantage',
            selector: 'situation',
            value: -1,
         }),
      ]);

      /** @type {object} The derived Item Check parameters with the situation ticked. */
      const item = model.getItemCheckParameters(createItemCheckOptions({
         attribute: 'body',
         difficulty: 4,
         itemRollData: ITEM_ROLL_DATA,
         situations: ['darkness'],
         skill: 'athletics',
      }));
      expect(item.advantage).toBe(-1);
      expect(item.difficulty).toBe(5);
      expect(item.situations).toEqual([
         {
            key: 'darkness',
            label: 'Darkness',
         },
      ]);

      /** @type {object} The derived Casting Check parameters with the same situation ticked. */
      const casting = model.getCastingCheckParameters(createCastingCheckOptions({
         attribute: 'body',
         difficulty: 4,
         itemId: 's',
         situations: ['darkness'],
         skill: 'athletics',
      }));
      expect(casting.advantage).toBe(0);
      expect(casting.situations).toEqual([]);
   });
});

describe('item-based check options take Advantage and Automatic Failure from the cache unless provided', () => {
   /**
    * Builds a model whose conditional cache holds a Disadvantage of the given check type and an `any` Automatic
    * Failure, and whose one owned item returns the given roll data.
    * @param {string} checkType - The element check type of the Disadvantage (`attack`, `casting`, or `item`).
    * @param {object} itemRollData - The owned item's roll data.
    * @returns {object} The model instance.
    */
   function cachedModel(checkType, itemRollData) {
      /** @type {object} The model under test. */
      const model = createItemModel(itemRollData);
      model._applyConditionalCheckModifierElements([
         checkModifier({
            checkType,
            modifierType: 'advantage',
            value: -1,
         }),
         checkModifier({
            modifierType: 'automaticFailure',
         }),
      ]);
      return model;
   }

   /** @type {object} The provided values that override the cache. */
   const PROVIDED = {
      advantage: 2,
      automaticFailure: false,
   };

   it('initializes Attack Check options', () => {
      /** @type {object} The model under test. */
      const model = cachedModel('attack', WEAPON_ROLL_DATA);
      /** @type {object} Attack options that need no rating or target lookup. */
      const options = {
         attackerAccuracy: 0,
         attackerMelee: 0,
         itemId: 'w',
         targetDefense: 3,
      };
      expect(model.initializeAttackCheckOptions(options)).toMatchObject({
         advantage: -1,
         automaticFailure: true,
      });
      expect(model.initializeAttackCheckOptions({
         ...options,
         ...PROVIDED,
      })).toMatchObject(PROVIDED);
   });

   it('initializes Casting Check options', () => {
      /** @type {object} The model under test. */
      const model = cachedModel('casting', SPELL_ROLL_DATA);
      expect(model.initializeCastingCheckOptions({ itemId: 's' })).toMatchObject({
         advantage: -1,
         automaticFailure: true,
      });
      expect(model.initializeCastingCheckOptions({
         itemId: 's',
         ...PROVIDED,
      })).toMatchObject(PROVIDED);
   });

   it('initializes Item Check options', () => {
      /** @type {object} The model under test. */
      const model = cachedModel('item', ITEM_ROLL_DATA);
      expect(model.initializeItemCheckOptions({ itemRollData: ITEM_ROLL_DATA })).toMatchObject({
         advantage: -1,
         automaticFailure: true,
      });
      expect(model.initializeItemCheckOptions({
         itemRollData: ITEM_ROLL_DATA,
         ...PROVIDED,
      })).toMatchObject(PROVIDED);
   });
});

/**
 * The key each keyed selector matches in the table tests below; `any` and `multiAttack` hold a sum with no key.
 * @type {Record<string, string>}
 */
const TABLE_KEYS = {
   attackTrait: 'rend',
   attackType: 'melee',
   attribute: 'body',
   customTrait: 'glowing',
   resistance: 'reflexes',
   skill: 'athletics',
   spellTradition: 'fire',
};

/** @type {string[]} Every cached check type an element can name. */
const TABLE_CHECK_TYPES = [
   'any',
   'attack',
   'casting',
   'item',
   'resistance',
];

/** @type {string[]} Every selector a conditional check modifier can name, keyed or not. */
const TABLE_SELECTORS = [
   'any',
   'multiAttack',
   ...Object.keys(TABLE_KEYS),
];

/**
 * Builds a Dice cache holding a distinct power of two in every check-type and selector cell, so a lookup's sum names
 * exactly the cells it read.
 * @returns {{cache: object, cellValue: (checkType: string, selector: string) => number}} The cache and each cell's
 * value.
 */
function createFullDiceCache() {
   /** @type {Record<string, number>} Each cell's value, keyed `checkType.selector`. */
   const values = {};
   /** @type {object} The Dice modifiers keyed by check type, then selector. */
   const dice = {};
   /** @type {number} The next cell's power of two. */
   let next = 1;
   for (const checkType of TABLE_CHECK_TYPES) {
      dice[checkType] = {};
      for (const selector of TABLE_SELECTORS) {
         values[`${checkType}.${selector}`] = next;
         dice[checkType][selector] = TABLE_KEYS[selector] ? { [TABLE_KEYS[selector]]: next } : next;
         next *= 2;
      }
   }
   return {
      cache: { conditionalCheckModifier: { dice } },
      cellValue: (checkType, selector) => values[`${checkType}.${selector}`],
   };
}

describe('conditional check modifier lookups — the cells each check type reads', () => {
   it.each([
      {
         checkType: 'attribute',
         read: (model) => model.getAttributeCheckMod('dice', 'body', 'athletics'),
         cells: {
            any: [
               'any',
               'attribute',
               'skill',
            ],
         },
      },
      {
         checkType: 'resistance',
         read: (model) => model.getResistanceCheckMod('dice', 'reflexes'),
         cells: {
            any: ['any'],
            resistance: [
               'any',
               'resistance',
            ],
         },
      },
      {
         checkType: 'attack',
         read: (model) => model.getAttackCheckMod('dice', 'body', 'athletics', true, 'melee', ['rend'], ['glowing']),
         cells: {
            any: [
               'any',
               'attribute',
               'skill',
               'customTrait',
            ],
            attack: [
               'any',
               'attribute',
               'skill',
               'attackType',
               'attackTrait',
               'customTrait',
               'multiAttack',
            ],
         },
      },
      {
         checkType: 'casting',
         read: (model) => model.getCastingCheckMod('dice', 'body', 'athletics', 'fire', ['glowing']),
         cells: {
            any: [
               'any',
               'attribute',
               'skill',
               'customTrait',
            ],
            casting: [
               'any',
               'attribute',
               'skill',
               'spellTradition',
               'customTrait',
            ],
         },
      },
      {
         checkType: 'item',
         read: (model) => model.getItemCheckMod('dice', 'body', 'athletics', ['glowing']),
         cells: {
            any: [
               'any',
               'attribute',
               'skill',
               'customTrait',
            ],
            item: [
               'any',
               'attribute',
               'skill',
               'customTrait',
            ],
         },
      },
   ])('a $checkType check sums exactly its cells', ({ read, cells }) => {
      /** @type {{cache: object, cellValue: Function}} The full cache and its cell values. */
      const { cache, cellValue } = createFullDiceCache();

      /** @type {number} The sum of the cells the check type reads. */
      const expected = Object.entries(cells).reduce((sum, [cachedCheckType, selectors]) => sum +
         selectors.reduce((cellSum, selector) => cellSum + cellValue(cachedCheckType, selector), 0), 0);
      expect(read(createModel(cache))).toBe(expected);
   });

   it('reads a multi-attack cell only for a multi-attack', () => {
      /** @type {{cache: object, cellValue: Function}} The full cache and its cell values. */
      const { cache, cellValue } = createFullDiceCache();

      /** @type {object} The Character. */
      const model = createModel(cache);
      expect(model.getAttackCheckMod('dice', 'body', 'athletics', true, 'melee', [], []) -
         model.getAttackCheckMod('dice', 'body', 'athletics', false, 'melee', [], [])).toBe(cellValue('attack',
         'multiAttack'));
   });
});

describe('conditional check modifier lookups — blank keys and non-Boolean multiAttack', () => {
   it('a blank single key never matches, even a cell stored under the blank key', () => {
      /** @type {object} The model, whose Tradition cell exists only under the blank key. */
      const model = createModel({
         conditionalCheckModifier: {
            dice: {
               casting: {
                  spellTradition: {
                     '': 8,
                     fire: 2,
                  },
               },
            },
         },
      });
      expect(model.getCastingCheckMod('dice', 'body', 'athletics', '', [])).toBe(0);
      expect(model.getCastingCheckMod('dice', 'body', 'athletics', 'fire', [])).toBe(2);
   });

   it('a blank key inside an array key never matches while its siblings do', () => {
      /** @type {object} The model, whose Custom Trait cell holds a blank key beside a real one. */
      const model = createModel({
         conditionalCheckModifier: {
            dice: {
               item: {
                  customTrait: {
                     '': 8,
                     glowing: 2,
                  },
               },
            },
         },
      });
      expect(model.getItemCheckMod('dice', 'body', 'athletics', [
         '',
         'glowing',
      ])).toBe(2);
      expect(model.getItemCheckMod('dice', 'body', 'athletics', [''])).toBe(0);
   });

   it('the check modifier cache builder stores nothing under a blank key', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            key: '',
            selector: 'spellTradition',
         }),
         checkModifier({
            key: 'Fire',
            selector: 'spellTradition',
         }),
         checkModifier({
            key: '',
            selector: 'skill',
         }),
      ]);
      expect(model.parent.rulesElementsCache.conditionalCheckModifier.dice.any).toEqual({
         skill: {},
         spellTradition: { fire: 1 },
      });
   });

   it('the rating modifier cache builder stores nothing under a blank key', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalRatingModifierElements([
         {
            key: '',
            rating: 'melee',
            selector: 'attackTrait',
            type: 'ability',
            value: 1,
         },
         {
            key: 'rend',
            rating: 'melee',
            selector: 'attackTrait',
            type: 'ability',
            value: 2,
         },
      ]);
      expect(model.parent.rulesElementsCache.conditionalRatingModifier.melee.attackTrait).toEqual({
         rend: { ability: 2 },
      });
   });

   it('the roll message cache builder stores nothing under a blank key', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyRollMessageElements([
         {
            checkType: 'any',
            key: '',
            message: 'Blank',
            selector: 'customTrait',
         },
         {
            checkType: 'any',
            key: 'glowing',
            message: 'Real',
            selector: 'customTrait',
         },
      ]);
      expect(model.parent.rulesElementsCache.rollMessage.any.customTrait).toEqual({ glowing: ['Real'] });
   });

   it('a whitespace-only single key never matches, even a cell stored under it', () => {
      /** @type {object} The model, whose Tradition cell exists only under a whitespace key. */
      const model = createModel({
         conditionalCheckModifier: {
            dice: {
               casting: {
                  spellTradition: {
                     '  ': 8,
                     fire: 2,
                  },
               },
            },
         },
      });
      expect(model.getCastingCheckMod('dice', 'body', 'athletics', '  ', [])).toBe(0);
      expect(model.getCastingCheckMod('dice', 'body', 'athletics', 'fire', [])).toBe(2);
   });

   it('a whitespace-only key inside an array key never matches while its siblings do', () => {
      /** @type {object} The model, whose Custom Trait cell holds a whitespace key beside a real one. */
      const model = createModel({
         conditionalCheckModifier: {
            dice: {
               item: {
                  customTrait: {
                     '  ': 8,
                     glowing: 2,
                  },
               },
            },
         },
      });
      expect(model.getItemCheckMod('dice', 'body', 'athletics', [
         '  ',
         'glowing',
      ])).toBe(2);
      expect(model.getItemCheckMod('dice', 'body', 'athletics', ['  '])).toBe(0);
   });

   it('the three keyed cache builders store nothing under a whitespace-only key', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyConditionalCheckModifierElements([
         checkModifier({
            key: '  ',
            selector: 'spellTradition',
         }),
         checkModifier({
            key: 'Fire',
            selector: 'spellTradition',
         }),
      ]);
      expect(model.parent.rulesElementsCache.conditionalCheckModifier.dice.any).toEqual({
         spellTradition: { fire: 1 },
      });
      model._applyConditionalRatingModifierElements([
         {
            key: '  ',
            rating: 'melee',
            selector: 'attackTrait',
            type: 'ability',
            value: 1,
         },
         {
            key: 'rend',
            rating: 'melee',
            selector: 'attackTrait',
            type: 'ability',
            value: 2,
         },
      ]);
      expect(model.parent.rulesElementsCache.conditionalRatingModifier.melee.attackTrait).toEqual({
         rend: { ability: 2 },
      });
      model._applyRollMessageElements([
         {
            checkType: 'any',
            key: '  ',
            message: 'Blank',
            selector: 'customTrait',
         },
         {
            checkType: 'any',
            key: 'glowing',
            message: 'Real',
            selector: 'customTrait',
         },
      ]);
      expect(model.parent.rulesElementsCache.rollMessage.any.customTrait).toEqual({ glowing: ['Real'] });
   });

   it('the situational cache builder skips blank-key situations and offers only the real one', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applySituationalCheckModifierElements([
         checkModifier({
            key: '',
            modifierType: 'advantage',
            selector: 'situation',
         }),
         checkModifier({
            key: '   ',
            modifierType: 'advantage',
            selector: 'situation',
         }),
         checkModifier({
            key: 'Flanking',
            modifierType: 'advantage',
            selector: 'situation',
         }),
      ]);
      expect(model.parent.rulesElementsCache.situationalCheckModifier.map((entry) => entry.key)).toEqual([
         'flanking',
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' }).map((entry) => entry.key))
         .toEqual(['flanking']);
   });

   it('the situational cache is false when every situation key is blank', () => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applySituationalCheckModifierElements([
         checkModifier({
            key: '',
            modifierType: 'advantage',
            selector: 'situation',
         }),
      ]);
      expect(model.parent.rulesElementsCache.situationalCheckModifier).toBe(false);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([]);
   });

   it('createAttackCheckOptions stores multiAttack as a Boolean', () => {
      expect(createAttackCheckOptions({ multiAttack: 1 }).multiAttack).toBe(true);
      expect(createAttackCheckOptions({ multiAttack: 'yes' }).multiAttack).toBe(true);
      expect(createAttackCheckOptions({ multiAttack: 0 }).multiAttack).toBe(false);
      expect(createAttackCheckOptions({}).multiAttack).toBe(false);
   });

   it('an Attack Check initialized from a weapon carries the weapon\'s multiAttack as a Boolean', () => {
      /** @type {object} The initialized options for a weapon whose multiAttack is truthy but not a Boolean. */
      const options = createItemModel({
         ...WEAPON_ROLL_DATA,
         multiAttack: 1,
      }).initializeAttackCheckOptions({
         attackerAccuracy: 0,
         attackerMelee: 0,
         itemId: 'w',
         targetDefense: 3,
      });
      expect(options.multiAttack).toBe(true);
   });

   it('a truthy non-Boolean multiAttack reads the multiAttack cell like true does', () => {
      /** @type {{cache: object, cellValue: Function}} The full cache and its cell values. */
      const { cache, cellValue } = createFullDiceCache();

      /** @type {object} The Character. */
      const model = createModel(cache);
      /** @type {object} The Attack Check options an Attack Check reads its mods from. */
      const options = createAttackCheckOptions({ multiAttack: 1 });
      expect(model.getAttackCheckMod('dice', 'body', 'athletics', options.multiAttack, 'melee', [], []) -
         model.getAttackCheckMod('dice', 'body', 'athletics', false, 'melee', [], [])).toBe(cellValue('attack',
         'multiAttack'));
   });
});

describe('CharacterDataModel.requestAttributeCheck — situational lookup', () => {
   it('looks up situations for the options\' Skill without initializing the options', async () => {
      globalThis.game.keyboard = { isModifierActive: () => false };
      globalThis.foundry.helpers = {
         interaction: {
            KeyboardManager: { MODIFIER_KEYS: { SHIFT: 'Shift' } },
         },
      };
      try {
         /** @type {object} A Character with one situation narrowed to Athletics. */
         const model = createModel({
            situationalCheckModifier: [
               {
                  checkType: 'any',
                  key: 'underwater',
                  label: 'Underwater',
                  modifierType: 'dice',
                  skill: 'athletics',
                  source: 'Effect',
                  value: -1,
               },
            ],
         });
         model.rollAttributeCheck = vi.fn();
         model._createAttributeCheckDialog = vi.fn();
         vi.spyOn(model, 'initializeAttributeCheckOptions');
         vi.spyOn(model, 'getSituationalCheckModifiers');

         // An Athletics check has the situation, so it opens the dialog; a Body check (Skill None) rolls.
         await model.requestAttributeCheck({ skill: 'athletics' });
         await model.requestAttributeCheck({ attribute: 'body' });
         expect(model.getSituationalCheckModifiers.mock.calls).toEqual([
            [
               'attribute',
               { skill: 'athletics' },
            ],
            [
               'attribute',
               { skill: 'none' },
            ],
         ]);
         expect(model._createAttributeCheckDialog).toHaveBeenCalledWith({ skill: 'athletics' });
         expect(model.rollAttributeCheck).toHaveBeenCalledWith({ attribute: 'body' });
         expect(model.initializeAttributeCheckOptions).not.toHaveBeenCalled();
      }
      finally {
         delete globalThis.game.keyboard;
         delete globalThis.foundry.helpers;
         vi.restoreAllMocks();
      }
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

describe('CharacterDataModel._expandAllKeyElements — selectors with no stat map', () => {
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
      [
         'rollMessage',
         'spellTradition',
      ],
      [
         'flatModifier',
         'noStatMapSelector',
      ],
   ])('keeps a %s element with the stat-map-less %s selector, key "all" included, unchanged', (operation, selector) => {
      /** @type {object} An element whose typed key is the reserved word. */
      const element = {
         key: 'all',
         operation,
         selector,
      };
      expect(createModel()._expandAllKeyElements([element])).toEqual([element]);
   });
});

describe('typed-key builders camel-case through TYPED_KEY_SELECTORS', () => {
   it.each(TYPED_KEY_SELECTORS.rollMessage)('the roll message cache groups %s keys in camel case', (selector) => {
      /** @type {object} The model under test. */
      const model = createModel();
      model._applyRollMessageElements([
         {
            checkType: 'any',
            key: 'Field Medicine',
            message: 'First',
            selector,
         },
         {
            checkType: 'any',
            key: 'fieldMedicine',
            message: 'Second',
            selector,
         },
      ]);
      expect(model.parent.rulesElementsCache.rollMessage.any[selector]).toEqual({
         fieldMedicine: [
            'First',
            'Second',
         ],
      });
   });

   it.each(TYPED_KEY_SELECTORS.conditionalRatingModifier)(
      'the rating modifier cache groups %s keys in camel case',
      (selector) => {
         /** @type {object} The model under test. */
         const model = createModel();
         model._applyConditionalRatingModifierElements([
            {
               key: 'Field Medicine',
               rating: 'melee',
               selector,
               type: 'ability',
               value: 1,
            },
            {
               key: 'fieldMedicine',
               rating: 'melee',
               selector,
               type: 'ability',
               value: 2,
            },
         ]);
         expect(model.parent.rulesElementsCache.conditionalRatingModifier.melee[selector]).toEqual({
            fieldMedicine: { ability: 3 },
         });
      },
   );

   it.each(TYPED_KEY_SELECTORS.conditionalCheckModifier)(
      'the check modifier cache groups %s keys in camel case',
      (selector) => {
         /** @type {object} The model under test. */
         const model = createModel();
         model._applyConditionalCheckModifierElements([
            checkModifier({
               key: 'Field Medicine',
               selector,
            }),
            checkModifier({
               key: 'fieldMedicine',
               selector,
            }),
         ]);
         expect(Object.keys(model.parent.rulesElementsCache.conditionalCheckModifier.dice.any[selector]))
            .toEqual(['fieldMedicine']);
      },
   );
});
