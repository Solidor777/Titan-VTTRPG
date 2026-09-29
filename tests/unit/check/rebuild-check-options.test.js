import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { get, writable } from 'svelte/store';
import rebuildCheckOptions, {
   CHECK_OPTIONS_METHODS,
   createCheckOptionSetter,
   freezeCheckOptions,
} from '~/check/dialog/RebuildCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import { installSchemaMocks, restoreSchemaMocks } from '../helpers/schemaFingerprint.js';

// The rebuild runs the real `initialize<Type>CheckOptions` and `validate<Type>CheckOptions` of a bare
// CharacterDataModel (Object.create over the prototype) whose parent carries a rules-elements cache and owned items,
// so every derivation branch the initializers use is exercised as written, with no list of derived fields.

/**
 * The Attack Check dialogs `_createAttackCheckDialog` constructs, captured with their arguments.
 * @type {object[][]}
 */
const dialogCalls = vi.hoisted(() => []);

vi.mock('~/check/types/attack-check/dialog/AttackCheckDialog.js', () => ({
   default: class {
      /**
       * Captures the dialog's constructor arguments.
       * @param {...*} args - The checkOptions, checkParameters, actor, and callerOptions.
       */
      constructor(...args) {
         dialogCalls.push(args);
      }

      /**
       * Stands in for rendering the dialog.
       * @returns {void}
       */
      render() {}
   },
}));

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

/**
 * Stubbed actor roll data: Body 3, Mind 2, Soul 1; Reflexes 4; Athletics and Arcana untrained.
 * @type {object}
 */
const ROLL_DATA = {
   attribute: {
      body: { value: 3 },
      mind: { value: 2 },
      soul: { value: 1 },
   },
   resistance: {
      reflexes: { value: 4 },
   },
   skill: {
      arcana: {
         defaultAttribute: 'mind',
         expertise: { value: 0 },
         training: { value: 0 },
      },
      athletics: {
         defaultAttribute: 'body',
         expertise: { value: 0 },
         training: { value: 0 },
      },
   },
};

beforeAll(async () => {
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => 1,
   };
   globalThis.game.titan = {
      error: vi.fn(),
   };
   globalThis.game.user = {
      isGM: false,
      targets: new Set(),
   };
   globalThis.canvas = { tokens: { controlled: [] } };
   globalThis.ui = {
      notifications: {
         error: vi.fn(),
      },
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };
   CharacterDataModel = (await import('~/document/types/actor/types/character/CharacterDataModel.js')).default;
});

afterEach(() => {
   // Targeting, reported errors, and captured dialogs are per-test state; reset them even when a test fails.
   globalThis.game.user.targets = new Set();
   globalThis.game.titan.error.mockClear();
   globalThis.ui.notifications.error.mockClear();
   dialogCalls.length = 0;
});

afterAll(() => {
   restoreSchemaMocks();
   delete globalThis.canvas;
   delete globalThis.ui;
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * Builds an owned item whose roll data the test can replace, standing in for an item edited while a dialog is open.
 * @param {object} rollData - The item's initial roll data.
 * @returns {object} The item; assign `item.rollData` to edit it.
 */
function createItem(rollData) {
   /** @type {object} The stand-in item. */
   const item = {
      rollData,

      /**
       * Returns a copy of the item's current roll data, as `TitanItem#getRollData` does.
       * @returns {object} A fresh copy of `item.rollData`.
       */
      getRollData: () => structuredClone(item.rollData),
      system: {
         /**
          * The item's attacks, which `validateAttackCheckOptions` counts.
          * @returns {object[]} The attacks.
          */
         get attack() {
            return item.rollData.attack ?? [];
         },

         /**
          * Returns a copy of the item's current roll data, as the item data models do.
          * @returns {object} A fresh copy of `item.rollData`.
          */
         getRollData: () => structuredClone(item.rollData),
      },
   };
   return item;
}

/**
 * Builds a bare Character whose parent holds an empty rules-elements cache, the given owned items, and the given
 * effects, which its `allApplicableEffects` yields as Foundry's Actor does.
 * @param {Record<string, object>} [items] - The owned items keyed by id.
 * @param {Record<string, object>} [effects] - The applicable effects keyed by id.
 * @returns {object} The model instance.
 */
function createCharacter(items = {}, effects = {}) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      /**
       * Yields every effect that applies to the Actor.
       * @returns {Generator<object, void, void>} A generator over `effects`, each stamped with its map key as `id`.
       * @yields {object} An applicable effect.
       */
      *allApplicableEffects() {
         for (const [id, effect] of model.parent.effects) {
            effect.id = id;
            yield effect;
         }
      },
      effects: new Map(Object.entries(effects)),
      isOwner: true,
      items: new Map(Object.entries(items)),
      name: 'Rebuild Test Character',
      rulesElementsCache: {},
   };
   model.getRollData = () => structuredClone(ROLL_DATA);
   model.skill = structuredClone(ROLL_DATA.skill);
   model.rating = {
      accuracy: { value: 1 },
      melee: { value: 2 },
   };
   return model;
}

/**
 * Builds a conditional check modifier element: any check type, any selector, Dice +1 unless overridden.
 * @param {object} overrides - Fields replacing the defaults.
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
 * Builds a weapon's roll data with one plain Body/Athletics Melee attack.
 * @returns {object} A fresh weapon roll-data object, safe to edit.
 */
function weaponRollData() {
   return {
      attack: [
         {
            attribute: 'body',
            customTrait: [],
            damage: 1,
            label: 'Strike',
            plusExtraSuccessDamage: true,
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
      name: 'Weapon',
   };
}

/**
 * Builds a character-targeting token whose actor has the given Defense rating.
 * @param {number} defense - The target's Defense rating.
 * @returns {object} A stand-in token for `game.user.targets`.
 */
function targetToken(defense) {
   return {
      actor: {
         system: {
            getRollData: () => ({ rating: { defense: { value: defense } } }),
            isCharacter: true,
         },
      },
   };
}

describe('rebuildCheckOptions — keeps user edits and caller values, re-derives everything else', () => {
   it('Attribute: follows a conditional rules element (undefined test) and the Skill\'s default Attribute ' +
      '(\'default\' sentinel), keeping the caller\'s Dice and the user\'s Advantage and Skill', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter();

      /** @type {object} The raw request options: opened from Athletics with an explicit Dice modifier. */
      const callerOptions = {
         diceMod: 3,
         skill: 'athletics',
      };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeAttributeCheckOptions(callerOptions);
      expect(currentOptions.attribute).toBe('body');

      // The Actor gains always-on Dice, Expertise, and Disadvantage modifiers while the dialog is open.
      system._applyConditionalCheckModifierElements([
         checkModifier({ value: 2 }),
         checkModifier({ modifierType: 'expertise' }),
         checkModifier({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attribute',
         currentOptions,
         system,
         userEdits: {
            advantage: 2,
            skill: 'arcana',
         },
      })).toMatchObject({
         advantage: 2,
         attribute: 'mind',
         diceMod: 3,
         expertiseMod: 1,
         skill: 'arcana',
      });
   });

   it('Resistance: follows conditional rules elements (undefined test), keeping the caller\'s Resistance and ' +
      'the user\'s Dice', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter();

      /** @type {object} The raw request options. */
      const callerOptions = { resistance: 'reflexes' };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeResistanceCheckOptions(callerOptions);
      system._applyConditionalCheckModifierElements([
         checkModifier({
            modifierType: 'expertise',
            value: 2,
         }),
         checkModifier({ modifierType: 'automaticFailure' }),
         checkModifier({ value: 4 }),
      ]);

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'resistance',
         currentOptions,
         system,
         userEdits: { diceMod: 1 },
      })).toMatchObject({
         automaticFailure: true,
         diceMod: 1,
         expertiseMod: 2,
         resistance: 'reflexes',
      });
   });

   it('Attack: follows the owned weapon (undefined tests, \'default\' sentinel), a conditional rating modifier, ' +
      'and the no-target Defense fallback, keeping the caller\'s Damage and the user\'s Accuracy', () => {
      /** @type {object} The owned weapon. */
      const weapon = createItem(weaponRollData());

      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ w: weapon });

      /** @type {object} The raw request options, with an explicit Damage modifier. */
      const callerOptions = {
         attackIdx: 0,
         damageMod: 2,
         itemId: 'w',
      };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeAttackCheckOptions(callerOptions);
      expect(currentOptions).toMatchObject({
         attackerMelee: 2,
         attribute: 'body',
         cleave: false,
         multiAttack: false,
         targetDefense: 2,
      });

      // The weapon's attack becomes a Mind, Cleave, Multi-Attack; a +2 Melee rating modifier and a Damage modifier
      // arrive on the Actor.
      /** @type {object} The edited roll data. */
      const edited = weaponRollData();
      edited.attack[0].attribute = 'mind';
      edited.attack[0].trait = [{ name: 'cleave' }];
      edited.multiAttack = true;
      weapon.rollData = edited;
      system._applyConditionalRatingModifierElements([
         {
            key: 'melee',
            rating: 'melee',
            selector: 'attackType',
            value: 2,
         },
      ]);
      system._applyConditionalCheckModifierElements([checkModifier({ modifierType: 'damage' })]);

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions,
         system,
         userEdits: { attackerAccuracy: 9 },
      })).toMatchObject({
         attackerAccuracy: 9,
         attackerMelee: 4,
         attribute: 'mind',
         cleave: true,
         damageMod: 2,
         multiAttack: true,
         targetDefense: 4,
      });
   });

   it('Casting: follows the owned spell (=== undefined tests, \'default\' sentinel) and a conditional rules element, ' +
      'keeping the user\'s Complexity', () => {
      /** @type {object} The owned spell. */
      const spell = createItem({
         castingCheck: {
            attribute: 'mind',
            complexity: 2,
            difficulty: 4,
            skill: 'arcana',
         },
         customTrait: [],
         tradition: '',
      });

      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ s: spell });

      /** @type {object} The raw request options. */
      const callerOptions = { itemId: 's' };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeCastingCheckOptions(callerOptions);
      expect(currentOptions).toMatchObject({
         complexity: 2,
         difficulty: 4,
         skill: 'arcana',
      });

      // The spell's Difficulty, Complexity, and Skill are edited; a Healing modifier arrives on the Actor.
      spell.rollData = {
         ...spell.rollData,
         castingCheck: {
            attribute: 'mind',
            complexity: 1,
            difficulty: 5,
            skill: 'athletics',
         },
      };
      system._applyConditionalCheckModifierElements([checkModifier({ modifierType: 'healing' })]);

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'casting',
         currentOptions,
         system,
         userEdits: { complexity: 3 },
      })).toMatchObject({
         complexity: 3,
         difficulty: 5,
         healingMod: 1,
         skill: 'athletics',
      });
   });

   it('Item: follows the owned item\'s check data (=== undefined test, \'default\' sentinel, roll data), keeping the ' +
      'caller\'s Difficulty and the user\'s Double Training', () => {
      /** @type {object} The owned item. */
      const item = createItem({
         check: [
            {
               attribute: 'body',
               complexity: 1,
               difficulty: 4,
               skill: 'arcana',
            },
         ],
         customTrait: [],
      });

      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ i: item });

      /** @type {object} The raw request options, with an explicit Difficulty. */
      const callerOptions = {
         checkIdx: 0,
         difficulty: 3,
         itemId: 'i',
      };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeItemCheckOptions(callerOptions);
      item.rollData = {
         ...item.rollData,
         check: [
            {
               attribute: 'soul',
               complexity: 2,
               difficulty: 6,
               skill: 'arcana',
            },
         ],
      };

      /** @type {object} The rebuilt options. */
      const rebuilt = rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions,
         system,
         userEdits: { doubleTraining: true },
      });
      expect(rebuilt).toMatchObject({
         attribute: 'soul',
         complexity: 2,
         difficulty: 3,
         doubleTraining: true,
      });
      expect(rebuilt.itemRollData.check[0].complexity).toBe(2);
   });
});

describe('rebuildCheckOptions — no-op, lost sources, and vanished checks', () => {
   it('returns undefined when the rebuild equals the current options, fresh arrays and roll data included', () => {
      /** @type {object} The owned item, whose roll data is a fresh object on every read. */
      const item = createItem({
         check: [
            {
               attribute: 'body',
               complexity: 1,
               difficulty: 4,
               skill: 'arcana',
            },
         ],
         customTrait: [],
      });

      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ i: item });

      /** @type {object} The raw request options. */
      const callerOptions = { itemId: 'i' };

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions: system.initializeItemCheckOptions(callerOptions),
         system,
         userEdits: {},
      })).toBeUndefined();
   });

   it('keeps the displayed Attribute while the user\'s Skill of None leaves the \'default\' sentinel without a ' +
      'source, then follows the next Skill, reporting nothing', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter();

      /** @type {object} The raw request options: opened from Arcana, so the Attribute comes from the Skill. */
      const callerOptions = { skill: 'arcana' };

      /** @type {object} The options after the user picks Skill "None". */
      const noSkill = rebuildCheckOptions({
         callerOptions,
         checkType: 'attribute',
         currentOptions: system.initializeAttributeCheckOptions(callerOptions),
         system,
         userEdits: { skill: 'none' },
      });
      expect(noSkill).toMatchObject({
         attribute: 'mind',
         skill: 'none',
      });

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attribute',
         currentOptions: noSkill,
         system,
         userEdits: { skill: 'athletics' },
      })).toMatchObject({
         attribute: 'body',
         skill: 'athletics',
      });
      expect(globalThis.game.titan.error).not.toHaveBeenCalled();
   });

   it('returns undefined without reporting when the owned weapon is gone, leaving the dialog to close', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ w: createItem(weaponRollData()) });

      /** @type {object} The raw request options. */
      const callerOptions = {
         attackIdx: 0,
         itemId: 'w',
      };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeAttackCheckOptions(callerOptions);
      system.parent.items.delete('w');

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions,
         system,
         userEdits: {},
      })).toBeUndefined();
      expect(globalThis.game.titan.error).not.toHaveBeenCalled();
   });

   it('invalidates an Item Check whose owned item is gone, though its options carry the item\'s roll data', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter({
         i: createItem({
            check: [{ attribute: 'body' }],
            customTrait: [],
         }),
      });

      /** @type {object} The raw request options. */
      const callerOptions = { itemId: 'i' };

      /** @type {object} The options the dialog opened with, carrying the item's roll data. */
      const currentOptions = system.initializeItemCheckOptions(callerOptions);
      system.parent.items.delete('i');

      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions,
         system,
         userEdits: {},
      })).toBeUndefined();
      expect(system.validateItemCheckOptions(currentOptions, false)).toBe(false);
   });

   it('follows an effect-sourced Item Check\'s live effect, and invalidates it once the effect is gone', () => {
      /** @type {object} The Actor's effect carrying a check. */
      const effect = createItem({
         check: [
            {
               attribute: 'body',
               complexity: 1,
               difficulty: 4,
               skill: 'arcana',
            },
         ],
         customTrait: [],
      });

      /** @type {object} The Character rolling the check. */
      const system = createCharacter({}, { e: effect });

      /** @type {object} The raw request options: the effect's first check. */
      const callerOptions = {
         checkIdx: 0,
         effectId: 'e',
      };

      /** @type {object} The options the dialog opened with. */
      const currentOptions = system.initializeItemCheckOptions(callerOptions);
      expect(currentOptions.difficulty).toBe(4);

      // The effect's check Difficulty is edited while the dialog is open.
      effect.rollData = {
         ...effect.rollData,
         check: [
            {
               ...effect.rollData.check[0],
               difficulty: 6,
            },
         ],
      };

      /** @type {object} The rebuilt options. */
      const rebuilt = rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions,
         system,
         userEdits: {},
      });
      expect(rebuilt.difficulty).toBe(6);

      system.parent.effects.delete('e');
      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions: rebuilt,
         system,
         userEdits: {},
      })).toBeUndefined();
      expect(system.validateItemCheckOptions(rebuilt, false)).toBe(false);
      expect(globalThis.game.titan.error).not.toHaveBeenCalled();
   });

   it('reads an Item Check\'s roll data from the owned item its item ID names', () => {
      /** @type {object} The owned item. */
      const item = createItem({
         check: [{ difficulty: 4 }],
         customTrait: [],
      });

      /** @type {object} The options the dialog opened with, carrying the item's roll data. */
      const currentOptions = createCharacter({ i: item }).initializeItemCheckOptions({ itemId: 'i' });
      item.rollData = {
         ...item.rollData,
         check: [{ difficulty: 6 }],
      };

      expect(createCharacter({ i: item }).initializeItemCheckOptions(currentOptions).itemRollData.check[0].difficulty)
         .toBe(6);
   });
});

describe('Casting and Item Complexity and Difficulty', () => {
   /**
    * Builds a Character owning a spell (`s`) and an item (`i`) whose checks carry Complexity 2 and Difficulty 5.
    * @returns {object} The model instance.
    */
   function createCaster() {
      return createCharacter({
         i: createItem({
            check: [
               {
                  attribute: 'body',
                  complexity: 2,
                  difficulty: 5,
                  skill: 'arcana',
               },
            ],
            customTrait: [],
         }),
         s: createItem({
            castingCheck: {
               attribute: 'mind',
               complexity: 2,
               difficulty: 5,
               skill: 'arcana',
            },
            customTrait: [],
            tradition: '',
         }),
      });
   }

   it.each([
      [
         'Casting',
         'initializeCastingCheckOptions',
         { itemId: 's' },
      ],
      [
         'Item',
         'initializeItemCheckOptions',
         { itemId: 'i' },
      ],
   ])('%s: keeps an explicit Complexity of 0 and derives an omitted one from the check data', (_type, method,
      options) => {
      /** @type {object} The Character rolling the check. */
      const system = createCaster();
      expect(system[method]({
         ...options,
         complexity: 0,
      }).complexity).toBe(0);
      expect(system[method](options)).toMatchObject({
         complexity: 2,
         difficulty: 5,
      });
   });

   it.each([
      [
         'Casting',
         'initializeCastingCheckOptions',
         's',
      ],
      [
         'Item',
         'initializeItemCheckOptions',
         'i',
      ],
   ])('%s: keeps an explicit Difficulty of 0 rather than replacing it with the check data', (_type, method,
      itemId) => {
      expect(createCaster()[method]({
         difficulty: 0,
         itemId,
      }).difficulty).toBe(0);
   });

   it.each([
      [
         'Casting',
         createCastingCheckOptions,
      ],
      [
         'Item',
         createItemCheckOptions,
      ],
   ])('%s: the options factory leaves an unsupplied Complexity and Difficulty undefined', (_type, create) => {
      expect(create({})).toMatchObject({
         complexity: undefined,
         difficulty: undefined,
      });
      expect(Object.hasOwn(create({}), 'complexity')).toBe(true);
   });
});

describe('check index validation', () => {
   it('rejects, without reporting, an Attack index one past the weapon\'s last attack', () => {
      /** @type {object} The Character, whose weapon has one attack. */
      const system = createCharacter({ w: createItem(weaponRollData()) });
      expect(system.validateAttackCheckOptions({
         attackIdx: 1,
         itemId: 'w',
      }, false)).toBe(false);
      expect(system.validateAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      }, false)).toBe(true);
      expect(globalThis.game.titan.error).not.toHaveBeenCalled();
   });

   it('rejects, without reporting, an Item check index one past the item\'s last check', () => {
      /** @type {object} The Character, whose item has one check. */
      const system = createCharacter({
         i: createItem({
            check: [{ attribute: 'body' }],
            customTrait: [],
         }),
      });
      expect(system.validateItemCheckOptions({
         checkIdx: 1,
         itemId: 'i',
      }, false)).toBe(false);
      expect(system.validateItemCheckOptions({
         checkIdx: 0,
         itemId: 'i',
      }, false)).toBe(true);
      expect(globalThis.game.titan.error).not.toHaveBeenCalled();
   });

   it('rejects missing options for every check type', () => {
      /** @type {object} The Character. */
      const system = createCharacter();
      for (const methods of Object.values(CHECK_OPTIONS_METHODS)) {
         expect(system[methods.validate](undefined, false)).toBe(false);
      }
      expect(globalThis.game.titan.error).not.toHaveBeenCalled();
   });
});

describe('Attack targetDefense provenance (_createAttackCheckDialog)', () => {
   it('records a target\'s Defense resolved at open as a caller value, kept after the target is removed', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ w: createItem(weaponRollData()) });
      globalThis.game.user.targets = new Set([targetToken(5)]);

      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
      });

      /** @type {object} The caller options the dialog received. */
      const callerOptions = dialogCalls[0][3];
      expect(callerOptions.targetDefense).toBe(5);

      // Untargeting while the dialog is open keeps the target's Defense.
      globalThis.game.user.targets = new Set();
      /** @type {object} The options after a +2 Melee rating modifier arrives. */
      const rebuilt = rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system: withMeleeBonus(system),
         userEdits: {},
      });
      expect(rebuilt).toMatchObject({
         attackerMelee: 4,
         targetDefense: 5,
      });
   });

   it('keeps the caller\'s own targetDefense over a live target\'s Defense', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ w: createItem(weaponRollData()) });
      globalThis.game.user.targets = new Set([targetToken(5)]);

      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
         targetDefense: 7,
      });

      // A different target and a +2 Melee rating modifier arrive while the dialog is open.
      globalThis.game.user.targets = new Set([targetToken(6)]);
      expect(rebuildCheckOptions({
         callerOptions: dialogCalls[0][3],
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system: withMeleeBonus(system),
         userEdits: {},
      })).toMatchObject({
         attackerMelee: 4,
         targetDefense: 7,
      });
   });

   it('records nothing when untargeted at open, so the fallback follows and a later target is picked up', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter({ w: createItem(weaponRollData()) });

      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
      });

      /** @type {object} The caller options the dialog received. */
      const callerOptions = dialogCalls[0][3];
      expect(callerOptions.targetDefense).toBeUndefined();

      // The fallback (the attacker's own Melee) follows a +2 Melee rating modifier.
      /** @type {object} The options after the rating modifier arrives. */
      const followed = rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system: withMeleeBonus(system),
         userEdits: {},
      });
      expect(followed.targetDefense).toBe(4);

      // A target selected later supplies its Defense.
      globalThis.game.user.targets = new Set([targetToken(6)]);
      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions: followed,
         system,
         userEdits: {},
      }).targetDefense).toBe(6);
   });
});

/**
 * Gives a Character an always-on +2 Melee rating modifier for Melee attacks.
 * @param {object} system - The Character.
 * @returns {object} The same Character.
 */
function withMeleeBonus(system) {
   system._applyConditionalRatingModifierElements([
      {
         key: 'melee',
         rating: 'melee',
         selector: 'attackType',
         value: 2,
      },
   ]);
   return system;
}

describe('createCheckOptionSetter', () => {
   it('records the write as a user edit and applies it to the options', () => {
      /** @type {import('svelte/store').Writable} The dialog's options. */
      const checkOptions = writable({
         advantage: 0,
         skill: 'none',
      });

      /** @type {import('svelte/store').Writable} The dialog's user edits. */
      const userEdits = writable({});

      /** @type {(field: string, value: *) => void} The tracked setter. */
      const setCheckOption = createCheckOptionSetter(checkOptions, userEdits);
      setCheckOption('skill', 'arcana');
      setCheckOption('advantage', -1);

      expect(get(userEdits)).toEqual({
         advantage: -1,
         skill: 'arcana',
      });
      expect(get(checkOptions)).toEqual({
         advantage: -1,
         skill: 'arcana',
      });
   });
});

describe('freezeCheckOptions', () => {
   it('copies and freezes plain objects and arrays at every depth, keeping other objects by reference', () => {
      /** @type {object} A non-plain object standing in for a caller's data model. */
      const model = new (class {
         /** @type {number} A field the model owns. */
         value = 1;
      })();

      /** @type {object} Check Options with nested plain data and a data model. */
      const options = {
         itemRollData: {
            check: [{ difficulty: 4 }],
         },
         model,
         situations: ['underwater'],
         skill: 'arcana',
      };

      /** @type {object} The frozen copy. */
      const frozen = freezeCheckOptions(options);
      expect(frozen).toEqual(options);
      expect(frozen).not.toBe(options);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.situations)).toBe(true);
      expect(Object.isFrozen(frozen.itemRollData.check[0])).toBe(true);
      expect(frozen.model).toBe(model);
      expect(Object.isFrozen(model)).toBe(false);
      expect(Object.isFrozen(options.situations)).toBe(false);
   });

   it('holds the rebuild\'s result and the tracked setter\'s writes frozen', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter();

      /** @type {object} The rebuilt options after the user picks Arcana. */
      const rebuilt = rebuildCheckOptions({
         callerOptions: { attribute: 'body' },
         checkType: 'attribute',
         currentOptions: system.initializeAttributeCheckOptions({ attribute: 'body' }),
         system,
         userEdits: { skill: 'arcana' },
      });
      expect(Object.isFrozen(rebuilt)).toBe(true);
      expect(Object.isFrozen(rebuilt.situations)).toBe(true);

      /** @type {import('svelte/store').Writable} The dialog's options. */
      const checkOptions = writable(rebuilt);
      createCheckOptionSetter(checkOptions, writable({}))('situations', ['underwater']);
      expect(Object.isFrozen(get(checkOptions))).toBe(true);
      expect(Object.isFrozen(get(checkOptions).situations)).toBe(true);
   });
});

describe('CHECK_OPTIONS_METHODS', () => {
   it('names the live Actor\'s initializer and validator for every check type', () => {
      for (const [checkType, methods] of Object.entries(CHECK_OPTIONS_METHODS)) {
         /** @type {string} The capitalized check type in the method names. */
         const type = `${checkType[0].toUpperCase()}${checkType.slice(1)}`;
         expect(methods.initialize).toBe(`initialize${type}CheckOptions`);
         expect(methods.validate).toBe(`validate${type}CheckOptions`);
         expect(typeof CharacterDataModel.prototype[methods.initialize]).toBe('function');
         expect(typeof CharacterDataModel.prototype[methods.validate]).toBe('function');
      }
      expect(Object.keys(CHECK_OPTIONS_METHODS).sort()).toEqual([
         'attack',
         'attribute',
         'casting',
         'item',
         'resistance',
      ]);
   });
});
