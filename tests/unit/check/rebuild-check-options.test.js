import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { get, writable } from 'svelte/store';
import rebuildCheckOptions, {
   CHECK_OPTIONS_METHODS,
   createCheckOptionSetter,
   freezeCheckOptions,
} from '~/check/dialog/RebuildCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import {
   CHECK_TYPE_CONDITIONAL_SELECTORS,
   CHECK_TYPE_MODIFIER_TYPES,
   CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS,
} from '~/system/ConditionalCheckModifierTypes.js';
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
       * Yields every effect that applies to the Actor, as Foundry's Actor does: its own effects, then each owned
       * item's effects that transfer to it.
       * @returns {Generator<object, void, void>} A generator over the applicable effects, each stamped with its map key
       * as `id`.
       * @yields {object} An applicable effect.
       */
      *allApplicableEffects() {
         for (const [id, effect] of model.parent.effects) {
            effect.id = id;
            yield effect;
         }
         for (const item of model.parent.items.values()) {
            for (const [id, effect] of item.effects ?? []) {
               if (effect.transfer) {
                  effect.id = id;
                  yield effect;
               }
            }
         }
      },
      effects: new Map(Object.entries(effects)),
      getActiveTokens: () => [],
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
 * Builds a character-targeting token whose actor has the given Defense rating and conditions.
 * @param {number} defense - The target's Defense rating.
 * @param {object} [options] - The target's conditions and position.
 * @param {string[]} [options.statuses] - The target's active condition ids.
 * @param {number} [options.x] - The token's center x on the fake gridless scene (100 pixels per space).
 * @param {string} [options.id] - The id the token reports, which a GM fallback exclusion matches.
 * @returns {object} A stand-in token for `game.user.targets`.
 */
function targetToken(defense, { statuses = [], x = 100, id = 'target-token' } = {}) {
   return {
      actor: {
         statuses: new Set(statuses),
         system: {
            getRollData: () => ({ rating: { defense: { value: defense } } }),
            isCharacter: true,
         },
      },
      document: tokenDocument(x, id),
      id,
   };
}

/**
 * A gridless fake scene, 100 pixels per space and 1 unit per space, measuring straight lines.
 * @type {object}
 */
const GRIDLESS_SCENE = {
   grid: {
      distance: 1,

      /**
       * Measures a straight two-waypoint path in grid units.
       * @param {{x: number, y: number}[]} waypoints - The start and end points, in pixels.
       * @returns {{distance: number}} The distance.
       */
      measurePath: ([a, b]) => ({ distance: Math.hypot(b.x - a.x, b.y - a.y) / 100 }),
   },
};

/**
 * Builds a token document centered at the given x on the gridless fake scene.
 * @param {number} x - The center x.
 * @param {string} [id] - The id the token document reports, which the attacker's token ids list.
 * @param {boolean} [controlled] - Whether the user controls the token.
 * @returns {object} The fake token document.
 */
function tokenDocument(x, id = 'attacker-token', controlled = false) {
   return {
      getCenterPoint: () => ({
         x,
         y: 0,
      }),
      getOccupiedGridSpaceOffsets: () => [],
      id,
      object: { controlled },
      parent: GRIDLESS_SCENE,
   };
}

/**
 * Gives a Character base-8 Melee and Accuracy (current value 8) and a token at x = 0 on the fake scene.
 * @param {object} system - The Character.
 * @returns {object} The Character.
 */
function withAttackerToken(system) {
   system.rating = {
      accuracy: {
         baseValue: 8,
         value: 8,
      },
      melee: {
         baseValue: 8,
         value: 8,
      },
   };
   system.parent.getActiveTokens = () => [tokenDocument(0)];
   return system;
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

   it('resolves an effect ID through an owned item\'s transferred effects, and not through untransferred ones', () => {
      /** @type {object} The owned item, carrying one transferred and one untransferred effect. */
      const item = createItem({
         check: [],
         customTrait: [],
      });
      item.effects = new Map([
         [
            'transferred',
            Object.assign(createItem({
               check: [{ difficulty: 5 }],
               customTrait: [],
            }), { transfer: true }),
         ],
         [
            'kept',
            Object.assign(createItem({
               check: [{ difficulty: 6 }],
               customTrait: [],
            }), { transfer: false }),
         ],
      ]);

      /** @type {object} The Character owning the item. */
      const system = createCharacter({ i: item });
      expect(system.initializeItemCheckOptions({ effectId: 'transferred' }).difficulty).toBe(5);
      expect(system.validateItemCheckOptions({ effectId: 'kept' }, false)).toBe(false);
   });

   it('reads Item Check parameters from the live effect when the options name it only by effect ID', () => {
      /** @type {object} The Actor's effect carrying a complete check. */
      const effect = createItem({
         check: [
            {
               attribute: 'body',
               complexity: 1,
               difficulty: 4,
               isDamage: false,
               isHealing: false,
               label: 'Effect Check',
               opposedCheck: {
                  attribute: 'body',
                  enabled: false,
                  skill: 'athletics',
               },
               resistanceCheck: 'none',
               resolveCost: 0,
               skill: 'arcana',
            },
         ],
         customTrait: [],
         description: 'An effect.',
         img: 'effect.svg',
         name: 'Live Effect',
      });

      /** @type {object} Options built by the factory but never initialized, so they carry no roll data. */
      const options = createItemCheckOptions({
         attribute: 'body',
         checkIdx: 0,
         complexity: 1,
         difficulty: 4,
         effectId: 'e',
         skill: 'arcana',
      });
      expect(createCharacter({}, { e: effect }).getItemCheckParameters(options)).toMatchObject({
         checkLabel: 'Effect Check',
         img: 'effect.svg',
         itemName: 'Live Effect',
      });
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

describe('Attack target conditions', () => {
   /**
    * Builds a Character with a weapon and a token, and targets a token with the given conditions and position.
    * @param {string[]} statuses - The target's condition ids.
    * @param {number} [x] - The target token's center x (100 = adjacent, 2100 = 21 spaces).
    * @returns {object} The Character.
    */
   function attackTarget(statuses, x = 100) {
      /** @type {object} The Character rolling the check. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      globalThis.game.user.targets = new Set([
         targetToken(5, {
            statuses,
            x,
         }),
      ]);
      return system;
   }

   it('an adjacent Prone target raises the attack\'s rating by a quarter of its base', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);

      /** @type {AttackCheckOptions} The initialized options. */
      const options = system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      });
      expect(options).toMatchObject({
         attackerAccuracy: 10,
         attackerMelee: 10,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'melee',
               value: 2,
            },
            {
               condition: 'prone',
               modifier: 'accuracy',
               value: 2,
            },
         ],
         targetDefense: 5,
      });
      expect(system.getAttackCheckParameters(options).targetConditions).toEqual([
         {
            condition: 'prone',
            modifier: 'melee',
            value: 2,
         },
      ]);
   });

   it('a Prone target 21 spaces away lowers a ranged attack\'s Accuracy by two quarters of its base', () => {
      /** @type {AttackCheckOptions} The initialized options. */
      const options = attackTarget(['prone'], 2100).initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         type: 'ranged',
      });
      expect(options.attackerAccuracy).toBe(4);
      expect(options.targetConditions).toEqual([
         {
            condition: 'prone',
            modifier: 'accuracy',
            value: -4,
         },
      ]);
   });

   it('an Incapacitated target fixes the Difficulty at 2 after Advantage, with or without tokens', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['incapacitated']);
      system.parent.getActiveTokens = () => [];

      /** @type {AttackCheckParameters} Parameters with Disadvantage. */
      const parameters = system.getAttackCheckParameters(system.initializeAttackCheckOptions({
         advantage: -1,
         attackIdx: 0,
         itemId: 'w',
      }));
      expect(parameters.difficulty).toBe(2);
      expect(parameters.targetConditions).toEqual([
         {
            condition: 'incapacitated',
            modifier: 'difficulty',
            value: 2,
         },
      ]);
   });

   it('a Prone target with no attacker token applies no distance modifier', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      system.parent.getActiveTokens = () => [];
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      })).toMatchObject({
         attackerMelee: 8,
         targetConditions: [],
      });
   });

   it('never reads the attacker\'s own controlled token as a GM\'s target', () => {
      /** @type {object} The Character, Prone, whose GM controls its token and targets nothing. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      globalThis.game.user.isGM = true;
      globalThis.canvas.tokens.controlled = [
         targetToken(9, {
            id: 'attacker-token',
            statuses: ['prone'],
         }),
      ];
      try {
         expect(system.initializeAttackCheckOptions({
            attackIdx: 0,
            itemId: 'w',
         })).toMatchObject({
            attackerMelee: 8,
            targetConditions: [],
            targetDefense: 8,
         });
      }
      finally {
         globalThis.game.user.isGM = false;
         globalThis.canvas.tokens.controlled = [];
      }
   });

   it('reads another controlled token as a GM\'s target when nothing is targeted', () => {
      /** @type {object} The Character, whose GM controls its own token and another Prone one. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      globalThis.game.user.isGM = true;
      globalThis.canvas.tokens.controlled = [
         targetToken(9, { id: 'attacker-token' }),
         targetToken(6, {
            id: 'other-token',
            statuses: ['prone'],
         }),
      ];
      try {
         expect(system.initializeAttackCheckOptions({
            attackIdx: 0,
            itemId: 'w',
         })).toMatchObject({
            attackerMelee: 10,
            targetDefense: 6,
         });
      }
      finally {
         globalThis.game.user.isGM = false;
         globalThis.canvas.tokens.controlled = [];
      }
   });

   it('reads an explicit target that is one of the attacker\'s own tokens as the target', () => {
      /** @type {object} The Character, whose GM targets its own Prone token. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      globalThis.game.user.targets = new Set([
         targetToken(9, {
            id: 'attacker-token',
            statuses: ['prone'],
         }),
      ]);
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      })).toMatchObject({
         attackerMelee: 10,
         targetDefense: 9,
      });
   });

   it('measures the distance from the attacker\'s controlled token, else its first token', () => {
      /** @type {object} The Character, whose second token is controlled. */
      const system = withAttackerToken(createCharacter({ w: createItem(weaponRollData()) }));
      system.parent.getActiveTokens = () => [
         tokenDocument(0, 'first-token'),
         tokenDocument(2500, 'second-token', true),
      ];
      globalThis.game.user.targets = new Set([
         targetToken(5, {
            statuses: ['prone'],
            x: 2600,
         }),
      ]);

      // 1 space from the controlled token and 26 from the first: the close bonus applies.
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      }).attackerMelee).toBe(10);

      // With none controlled the first token measures 26 spaces: two quarters of the base 8 lower the ranged Accuracy
      // 8 to 4.
      system.parent.getActiveTokens = () => [
         tokenDocument(0, 'first-token'),
         tokenDocument(2500, 'second-token'),
      ];
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         type: 'ranged',
      }).attackerAccuracy).toBe(4);
   });

   it('keeps a caller\'s rating and target conditions, dropping that rating\'s target entries', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);

      // The supplied Melee replaces the derived one, Prone bonus included, so only Accuracy's entry stays.
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         attackerMelee: 3,
         itemId: 'w',
      })).toMatchObject({
         attackerAccuracy: 10,
         attackerMelee: 3,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'accuracy',
               value: 2,
            },
         ],
      });
      // The supplied Accuracy replaces its derived one the same way, so only Melee's entry stays.
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         attackerAccuracy: 3,
         itemId: 'w',
      })).toMatchObject({
         attackerAccuracy: 3,
         attackerMelee: 10,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'melee',
               value: 2,
            },
         ],
      });
      expect(system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         targetConditions: [],
      })).toMatchObject({
         attackerMelee: 8,
         targetConditions: [],
         targetDefense: 5,
      });
   });

   it('reads the target\'s conditions when the caller supplies only its Defense', () => {
      expect(attackTarget(['prone']).initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         targetDefense: 7,
      })).toMatchObject({
         attackerMelee: 10,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'melee',
               value: 2,
            },
            {
               condition: 'prone',
               modifier: 'accuracy',
               value: 2,
            },
         ],
         targetDefense: 7,
      });
   });

   it('takes a quarter of the base rating, not of its current value', () => {
      /** @type {object} The Character, whose current Melee and Accuracy (12) exceed their base (8). */
      const near = attackTarget(['prone']);
      near.rating.melee.value = 12;
      near.rating.accuracy.value = 12;
      expect(near.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      })).toMatchObject({
         attackerAccuracy: 14,
         attackerMelee: 14,
      });

      // 21 spaces away: two quarters of the base 8 are 4, so Accuracy 12 becomes 8.
      /** @type {object} The Character with a Prone target 21 spaces away. */
      const far = attackTarget(['prone'], 2100);
      far.rating.accuracy.value = 12;
      expect(far.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
         type: 'ranged',
      }).attackerAccuracy).toBe(8);
   });

   it('keeps the conditions of fully populated options, as a dialog submits them to roll', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);

      /** @type {AttackCheckOptions} The options the dialog would hold. */
      const options = system.initializeAttackCheckOptions({
         attackIdx: 0,
         itemId: 'w',
      });
      expect(system.initializeAttackCheckOptions(options)).toMatchObject({
         attackerAccuracy: 10,
         attackerMelee: 10,
         targetConditions: options.targetConditions,
      });
      expect(options.targetConditions).toHaveLength(2);
   });

   it('drops the entries of a rating the user types from the conditions derived from the pinned facts', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
      });
      expect(rebuildCheckOptions({
         callerOptions: dialogCalls[0][3],
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system,
         userEdits: { attackerMelee: 9 },
      })).toMatchObject({
         attackerAccuracy: 10,
         attackerMelee: 9,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'accuracy',
               value: 2,
            },
         ],
      });
   });

   it('records the target\'s facts resolved at open as caller values, kept after untargeting', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
      });

      /** @type {object} The caller options the dialog received. */
      const callerOptions = dialogCalls[0][3];

      /** @type {TargetConditionModifier[]} The target conditions derived at open. */
      const opened = dialogCalls[0][0].targetConditions;
      expect(callerOptions.targetFacts).toEqual({
         distance: 1,
         statuses: ['prone'],
      });
      expect(callerOptions.targetConditions).toBeUndefined();
      expect(opened).toHaveLength(2);

      // Untargeted, then a +2 Melee rating modifier arrives: the rebuild keeps the pinned Prone bonus and Defense.
      globalThis.game.user.targets = new Set();
      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system: withMeleeBonus(system),
         userEdits: {},
      })).toMatchObject({
         attackerMelee: 12,
         targetConditions: opened,
         targetDefense: 5,
      });

      // Without the pinned facts the same rebuild derives none from the absent target.
      /** @type {object} The caller options without the pinned target facts. */
      const unpinned = { ...callerOptions };
      delete unpinned.targetFacts;
      expect(rebuildCheckOptions({
         callerOptions: unpinned,
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system,
         userEdits: {},
      })).toMatchObject({
         attackerMelee: 10,
         targetConditions: [],
         targetDefense: 5,
      });
   });

   it('follows a change of the attacker\'s base ratings while keeping the pinned facts', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);
      system._createAttackCheckDialog({
         attackIdx: 0,
         itemId: 'w',
      });

      // The base Melee and Accuracy rise from 8 to 12 (a quarter is 3), each current value by the same 4.
      system.rating.melee.baseValue = 12;
      system.rating.melee.value = 12;
      system.rating.accuracy.baseValue = 12;
      system.rating.accuracy.value = 12;
      expect(rebuildCheckOptions({
         callerOptions: dialogCalls[0][3],
         checkType: 'attack',
         currentOptions: dialogCalls[0][0],
         system,
         userEdits: {},
      })).toMatchObject({
         attackerAccuracy: 15,
         attackerMelee: 15,
         targetConditions: [
            {
               condition: 'prone',
               modifier: 'melee',
               value: 3,
            },
            {
               condition: 'prone',
               modifier: 'accuracy',
               value: 3,
            },
         ],
      });
   });

   it('keeps a caller-supplied list of conditions, dropping the entries of a rating the user types', () => {
      /** @type {object} The Character. */
      const system = attackTarget(['prone']);

      /** @type {TargetConditionModifier[]} The list the caller supplies. */
      const supplied = [
         {
            condition: 'prone',
            modifier: 'melee',
            value: 5,
         },
         {
            condition: 'prone',
            modifier: 'accuracy',
            value: 6,
         },
      ];
      expect(rebuildCheckOptions({
         callerOptions: {
            attackIdx: 0,
            itemId: 'w',
            targetConditions: supplied,
         },
         checkType: 'attack',
         currentOptions: {},
         system,
         userEdits: { attackerMelee: 9 },
      })).toMatchObject({
         attackerAccuracy: 14,
         attackerMelee: 9,
         targetConditions: [supplied[1]],
      });
   });
});

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

/**
 * Builds a class instance standing in for a live data model passed as roll data: nested arrays, and optionally a
 * `toObject` that returns a plain snapshot as Foundry's data models do.
 * @param {boolean} hasToObject - Whether the instance provides `toObject`.
 * @returns {object} The instance.
 */
function createLiveModel(hasToObject) {
   /** A class whose instances are not plain objects. */
   class LiveModel {
      /** @type {object[]} The model's checks. */
      check = [{ difficulty: 4 }];

      /** @type {string} A display name the snapshot must carry over. */
      name = 'Live Item';
   }
   if (hasToObject) {
      /**
       * Returns a plain snapshot of the model's data.
       * @returns {object} A structured clone of the model's fields.
       */
      LiveModel.prototype.toObject = function toObject() {
         return structuredClone({ ...this });
      };
   }
   return new LiveModel();
}

describe('freezeCheckOptions', () => {
   it('copies and freezes plain objects and arrays at every depth, leaving the source unfrozen', () => {
      /** @type {object} Check Options with nested plain data. */
      const options = {
         itemRollData: {
            check: [{ difficulty: 4 }],
         },
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
      expect(Object.isFrozen(options.situations)).toBe(false);
   });

   it.each([
      [
         'with toObject (a data model)',
         true,
      ],
      [
         'without toObject',
         false,
      ],
   ])('converts a class instance %s into a frozen plain snapshot, leaving the instance untouched', (_label,
      hasToObject) => {
      /** @type {object} A live-model-like roll data object with nested arrays. */
      const model = createLiveModel(hasToObject);

      /** @type {object} The frozen copy of options carrying the model. */
      const frozen = freezeCheckOptions({ itemRollData: model });
      expect(frozen.itemRollData).not.toBe(model);
      expect(Object.getPrototypeOf(frozen.itemRollData)).toBe(Object.prototype);
      expect(frozen.itemRollData).toEqual({
         check: [{ difficulty: 4 }],
         name: 'Live Item',
      });
      expect(Object.isFrozen(frozen.itemRollData.check[0])).toBe(true);
      expect(() => {
         frozen.itemRollData.check[0].difficulty = 6;
      }).toThrow(TypeError);
      expect(model.check[0].difficulty).toBe(4);
      expect(Object.isFrozen(model.check)).toBe(false);
   });

   it('keeps a null-prototype object\'s prototype, so its rebuild settles on the second pass', () => {
      /** @type {object} The Character rolling the check. */
      const system = createCharacter();

      /** @type {object} Item roll data built without a prototype. */
      const itemRollData = Object.assign(Object.create(null), {
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

      /** @type {object} The raw request options, carrying the roll data. */
      const callerOptions = {
         checkIdx: 0,
         itemRollData,
      };

      /** @type {object} The first rebuild, from options that lack the roll data's derived fields. */
      const first = rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions: {},
         system,
         userEdits: {},
      });
      expect(Object.getPrototypeOf(first.itemRollData)).toBe(null);
      expect(rebuildCheckOptions({
         callerOptions,
         checkType: 'item',
         currentOptions: first,
         system,
         userEdits: {},
      })).toBeUndefined();
   });

   it.each([
      [
         'Map',
         () => new Map([
            [
               'a',
               1,
            ],
         ]),
      ],
      [
         'Set',
         () => new Set([1]),
      ],
      [
         'Uint8Array',
         () => new Uint8Array([1]),
      ],
      [
         'Date',
         () => new Date(0),
      ],
   ])('rejects a %s, naming the field, and leaves the source untouched', (typeName, create) => {
      /** @type {object} Check Options whose roll data holds a value that is not plain data. */
      const options = {
         itemRollData: {
            lookup: create(),
         },
      };
      expect(() => freezeCheckOptions(options)).toThrow(new RegExp(`"itemRollData\\.lookup".*${typeName}`));
      expect(Object.isFrozen(options.itemRollData)).toBe(false);
   });

   it('rejects a function, naming the field', () => {
      expect(() => freezeCheckOptions({ onRoll: () => 1 })).toThrow(/"onRoll".*function/);
   });

   it('rejects a class instance that cannot be cloned, naming the field', () => {
      /** Roll data carrying a function field and no `toObject`, so it has no plain snapshot. */
      class CallbackHolder {
         /**
          * Stores a callback as an own field.
          */
         constructor() {
            /**
             * A callback no structured clone can copy.
             * @type {Function}
             * @returns {number} A constant.
             */
            this.callback = () => 1;
         }
      }
      expect(() => freezeCheckOptions({ itemRollData: new CallbackHolder() }))
         .toThrow(/"itemRollData".*CallbackHolder/);
   });

   it('rejects a cyclic object or array, naming the field that closes the cycle', () => {
      /** @type {object} Roll data that contains itself. */
      const loop = { name: 'Loop' };
      loop.self = loop;
      expect(() => freezeCheckOptions({ itemRollData: loop })).toThrow(/"itemRollData\.self".*cycl/);

      /** @type {*[]} An array that contains itself. */
      const situations = [];
      situations.push(situations);
      expect(() => freezeCheckOptions({ situations })).toThrow(/"situations\[0\]".*cycl/);
   });

   it('copies a value shared by two fields into each without calling it a cycle', () => {
      /** @type {object[]} Custom Traits two fields share. */
      const shared = [{ name: 'Glowing' }];

      /** @type {object} The frozen copy. */
      const frozen = freezeCheckOptions({
         customTrait: shared,
         itemRollData: { customTrait: shared },
      });
      expect(frozen.customTrait).toEqual(shared);
      expect(frozen.itemRollData.customTrait).toEqual(shared);
      expect(Object.isFrozen(frozen.itemRollData.customTrait[0])).toBe(true);
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
   });

   it('covers exactly the check types the modifier lookups and the rules-element editor know', () => {
      /** @type {string[]} The check types the conditional-modifier lookups are keyed by. */
      const lookupTypes = Object.keys(CHECK_TYPE_MODIFIER_TYPES).sort();
      expect(Object.keys(CHECK_OPTIONS_METHODS).sort()).toEqual(lookupTypes);

      // The editor offers `any` plus each check type that reads an element check type of its own.
      /** @type {string[]} The check types with an element check type of their own. */
      const ownTypes = lookupTypes.filter((checkType) => Object.hasOwn(
         CHECK_TYPE_CONDITIONAL_SELECTORS[checkType],
         checkType,
      ));
      expect(CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS
         .map((option) => option.value)
         .filter((value) => value !== 'any')
         .sort()).toEqual(ownTypes);
   });
});
