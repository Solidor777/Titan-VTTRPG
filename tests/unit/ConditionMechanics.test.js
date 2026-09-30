import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';
import { buildConditionDefinitions } from '~/system/Conditions.js';

// Condition mechanics through the real rules-element pipeline: a bare CharacterDataModel (Object.create over the
// prototype) whose parent carries the conditions as `condition`-subtype Active Effects runs `_applyRulesElements` and
// then `_applyMods`, and each stat's `value` is read as data preparation leaves it. The model is imported after the
// Foundry stand-ins are installed; dynamic import in beforeAll is permitted in tests.

/** @type {Function} The dynamically imported CharacterDataModel class. */
let CharacterDataModel;

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
 * Returns the condition definition with the given id.
 * @param {string} id - The condition id, such as `blinded` or `offBalance`.
 * @returns {object} The definition, carrying its `system.rulesElement` when the condition has stat mechanics.
 */
function definition(id) {
   return buildConditionDefinitions().find((condition) => condition.id === id);
}

/**
 * Builds a stat at the given base with every mod bucket at 0.
 * @param {number} base - The value stored as the stat's `baseValue`.
 * @returns {{baseValue: number, mod: Record<string, number>}} The stat, with a 0 in each mod bucket.
 */
function stat(base) {
   return {
      baseValue: base,
      mod: {
         static: 0,
         equipment: 0,
         effect: 0,
         ability: 0,
         condition: 0,
      },
   };
}

/**
 * Builds a bare Character carrying the given conditions as enabled `condition` Active Effects, with every attribute,
 * resistance, rating, and speed at the given base (no skills, resources, or mods, which no condition modifies).
 * @param {string[]} conditionIds - The condition ids to carry.
 * @param {number} [base] - The base of every stat.
 * @returns {object} The model, after `_applyRulesElements` and `_applyMods` (each stat's `value` is set).
 */
function createConditionedCharacter(conditionIds, base = 8) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(conditionIds.map((id, index) => [
         `condition${index}`,
         {
            disabled: false,
            id: `condition${index}`,
            name: id,
            statuses: new Set([id]),
            system: {
               rulesElement: structuredClone(definition(id).system?.rulesElement ?? []),
            },
            type: 'condition',
         },
      ])),
      items: new Map(),
      rulesElementsCache: {},
   };
   model.equipped = {
      armor: null,
      shield: null,
   };
   model.attribute = {
      body: stat(base),
      mind: stat(base),
      soul: stat(base),
   };
   model.resistance = {
      reflexes: stat(base),
      resilience: stat(base),
      willpower: stat(base),
   };
   model.rating = {
      accuracy: stat(base),
      awareness: stat(base),
      defense: stat(base),
      initiative: stat(base),
      melee: stat(base),
   };
   model.speed = {
      burrow: stat(base),
      climb: stat(base),
      fly: stat(base),
      stride: stat(base),
      swim: stat(base),
   };
   model.skill = {};
   model.resource = {};
   model.mod = {};
   model._applyRulesElements();
   model._applyMods();
   return model;
}

describe('quarter-of-base condition penalties', () => {
   it.each([
      [
         1,
         1,
      ],
      [
         2,
         2,
      ],
      [
         3,
         3,
      ],
      [
         4,
         3,
      ],
      [
         5,
         4,
      ],
      [
         6,
         5,
      ],
      [
         7,
         6,
      ],
      [
         8,
         6,
      ],
   ])('Stunned leaves a base-%i Defense at %i (¾ of the base, rounded up)', (base, expected) => {
      expect(createConditionedCharacter(['stunned'], base).rating.defense.value).toBe(expected);
   });

   it('stacks Blinded and Off-Balance additively: each subtracts a quarter of base 8 Defense, leaving 4', () => {
      expect(createConditionedCharacter([
         'blinded',
         'offBalance',
      ]).rating.defense.value).toBe(4);
   });

   // Stacked quarter penalties round per element (each condition's resulting value is rounded in sequence), so the
   // expected values differ from rounding the summed penalty once, which would leave 3 on base 6 and 4 on base 7.
   it.each([
      [
         6,
         4,
      ],
      [
         7,
         5,
      ],
   ])('rounds each stacked quarter penalty on its own: Blinded + Off-Balance leave base-%i Defense at %i', (
      base,
      expected,
   ) => {
      expect(createConditionedCharacter([
         'blinded',
         'offBalance',
      ], base).rating.defense.value).toBe(expected);
   });

   it('Blinded lowers base-8 Melee, Accuracy, and Defense to 6 and leaves Awareness', () => {
      /** @type {object} The Blinded character. */
      const model = createConditionedCharacter(['blinded']);
      expect(model.rating.melee.value).toBe(6);
      expect(model.rating.accuracy.value).toBe(6);
      expect(model.rating.defense.value).toBe(6);
      expect(model.rating.awareness.value).toBe(8);
   });

   it('Contaminated lowers every base-8 attribute and resistance to 6', () => {
      /** @type {object} The Contaminated character. */
      const model = createConditionedCharacter(['contaminated']);
      for (const stats of [
         model.attribute,
         model.resistance,
      ]) {
         for (const [key, statData] of Object.entries(stats)) {
            expect(statData.value, key).toBe(6);
         }
      }
   });

   it('Off-Balance lowers base-8 Accuracy, Awareness, Melee, and Defense to 6', () => {
      /** @type {object} The Off-Balance character. */
      const model = createConditionedCharacter(['offBalance']);
      for (const key of [
         'accuracy',
         'awareness',
         'melee',
         'defense',
      ]) {
         expect(model.rating[key].value, key).toBe(6);
      }
      expect(model.rating.initiative.value).toBe(8);
   });

   it('Prone halves base-8 speeds and lowers Melee and Accuracy to 6', () => {
      /** @type {object} The Prone character. */
      const model = createConditionedCharacter(['prone']);
      expect(model.speed.stride.value).toBe(4);
      expect(model.rating.melee.value).toBe(6);
      expect(model.rating.accuracy.value).toBe(6);
      expect(model.rating.defense.value).toBe(8);
   });

   it('Restrained zeroes speed and lowers Melee, Accuracy, and Defense to 6', () => {
      /** @type {object} The Restrained character. */
      const model = createConditionedCharacter(['restrained']);
      expect(model.speed.stride.value).toBe(0);
      expect(model.rating.melee.value).toBe(6);
      expect(model.rating.accuracy.value).toBe(6);
      expect(model.rating.defense.value).toBe(6);
   });
});

describe('condition check rules', () => {
   it('Frightened gives Attribute and Resistance checks Disadvantage', () => {
      /** @type {object} The Frightened character. */
      const model = createConditionedCharacter(['frightened']);
      expect(model.getAttributeCheckMod('advantage', 'body', 'athletics')).toBe(-1);
      expect(model.getResistanceCheckMod('advantage', 'willpower')).toBe(-1);
   });

   it.each([
      'incapacitated',
      'restrained',
   ])('%s automatically fails Reflexes checks and no other Resistance check', (id) => {
      /** @type {object} The conditioned character. */
      const model = createConditionedCharacter([id]);
      expect(model.getResistanceCheckMod('automaticFailure', 'reflexes')).toBeGreaterThan(0);
      expect(model.getResistanceCheckMod('automaticFailure', 'resilience')).toBe(0);
   });

   it.each([
      [
         'blinded',
         'reliesOnSight',
         'situationReliesOnSight',
      ],
      [
         'deafened',
         'reliesOnHearing',
         'situationReliesOnHearing',
      ],
   ])('%s offers the %s Automatic Failure on Perception checks only', (id, key, labelKey) => {
      /** @type {object} The conditioned character. */
      const model = createConditionedCharacter([id]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'perception' })).toEqual([
         {
            key,
            label: `LOCAL.${labelKey}.text`,
            labelKey,
            modifierType: 'automaticFailure',
            sources: [id],
            value: 1,
         },
      ]);
      expect(model.getSituationalCheckModifiers('attribute', { skill: 'athletics' })).toEqual([]);
   });
});
