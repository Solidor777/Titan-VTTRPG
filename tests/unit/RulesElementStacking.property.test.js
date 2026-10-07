import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { installSchemaMocks, restoreSchemaMocks } from './helpers/schemaFingerprint.js';

// Stacking invariant of flat modifiers through the real rules-element pipeline: a bare CharacterDataModel
// (Object.create over the prototype) whose parent owns one ability carrying the generated flat modifiers runs
// `_applyRulesElements` and `_applyMods`, and the Body attribute's `value` is read as data preparation leaves it. The
// model is imported after the Foundry stand-ins are installed; dynamic import in beforeAll is permitted in tests.

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
 * Builds a bare Character whose Body is 1 and which owns one ability with one flat modifier on Body per value.
 * @param {number[]} values - The values of the flat modifiers.
 * @returns {object} The model, after `_applyRulesElements` and `_applyMods` (each stat's `value` is set).
 */
function createCharacter(values) {
   /** @type {object} The bare model. */
   const model = Object.create(CharacterDataModel.prototype);
   model.parent = {
      effects: new Map(),
      items: new Map([
         [
            'stackingAbility',
            {
               _id: 'stackingAbility',
               id: 'stackingAbility',
               name: 'Stacking Ability',
               system: {
                  rulesElement: values.map((value, index) => ({
                     key: 'body',
                     operation: 'flatModifier',
                     selector: 'attribute',
                     uuid: `stacking-${index}`,
                     value,
                  })),
               },
               type: 'ability',
            },
         ],
      ]),
      rulesElementsCache: {},
   };
   model.equipped = {
      armor: null,
      shield: null,
   };
   model.attribute = {
      body: stat(1),
      mind: stat(1),
      soul: stat(1),
   };
   model.resistance = {
      reflexes: stat(1),
      resilience: stat(1),
      willpower: stat(1),
   };
   model.rating = {
      accuracy: stat(1),
      awareness: stat(1),
      defense: stat(1),
      initiative: stat(1),
      melee: stat(1),
   };
   model.speed = {
      burrow: stat(1),
      climb: stat(1),
      fly: stat(1),
      stride: stat(1),
      swim: stat(1),
   };
   model.skill = {};
   model.resource = {};
   model.mod = {};
   model._applyRulesElements();
   model._applyMods();
   return model;
}

describe('flat modifier stacking', () => {
   it('for any set of flat modifiers, Body = max(0, 1 + sum)', () => {
      fc.assert(
         fc.property(
            fc.array(fc.integer({
               min: -10,
               max: 10,
            }), { maxLength: 5 }),
            (values) => {
               /** @type {number} The floored sum the pipeline must produce from a Body of 1. */
               const expected = Math.max(0, 1 + values.reduce((sum, value) => sum + value, 0));
               return createCharacter(values).attribute.body.value === expected;
            },
         ),
         { numRuns: 100 },
      );
   });
});
