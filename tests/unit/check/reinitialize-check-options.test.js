import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import reinitializeCheckOptions, {
   ACTOR_DERIVED_CHECK_OPTION_FIELDS,
   INITIALIZE_CHECK_OPTIONS_METHODS,
   rederiveActorCheckOptionFields,
   seedTouchedFieldsFromCallerOptions,
} from '~/check/dialog/ReinitializeCheckOptions.js';

beforeAll(() => {
   // reinitializeCheckOptions's targetDefense guard reads getTargetedCharacters(), which reads these globals.
   globalThis.game = {
      user: {
         isGM: false,
         targets: new Set(),
      },
   };
   globalThis.canvas = { tokens: { controlled: [] } };
});

afterAll(() => {
   delete globalThis.game;
   delete globalThis.canvas;
});

describe('ACTOR_DERIVED_CHECK_OPTION_FIELDS', () => {
   it('omits Training for Resistance Checks and Damage/Healing where they do not apply', () => {
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.resistance).not.toContain('trainingMod');
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.resistance).not.toContain('damageMod');
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.attribute).not.toContain('damageMod');
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.attack).not.toContain('healingMod');
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.casting).toEqual(expect.arrayContaining([
         'damageMod',
         'healingMod',
      ]));
   });

   it('always includes Advantage and Automatic Failure', () => {
      for (const fields of Object.values(ACTOR_DERIVED_CHECK_OPTION_FIELDS)) {
         expect(fields).toContain('advantage');
         expect(fields).toContain('automaticFailure');
      }
   });
});

describe('reinitializeCheckOptions', () => {
   it('omits untouched actor-derived fields so the initializer re-derives them', () => {
      /** @type {object} A fully-resolved options object, as the dialog store holds it. */
      const checkOptions = {
         advantage: 1,
         attribute: 'body',
         automaticFailure: false,
         diceMod: 2,
         expertiseMod: 3,
         skill: 'none',
         trainingMod: 4,
      };

      expect(reinitializeCheckOptions(checkOptions, new Set(), 'attribute')).toEqual({
         attribute: 'body',
         skill: 'none',
      });
   });

   it('keeps a touched field at its dialog value', () => {
      /** @type {object} A fully-resolved options object, as the dialog store holds it. */
      const checkOptions = {
         advantage: 2,
         attribute: 'body',
         automaticFailure: true,
         diceMod: 2,
         expertiseMod: 3,
         skill: 'none',
         trainingMod: 4,
      };

      /** @type {Set<string>} The user has edited Advantage and Automatic Failure. */
      const touchedFields = new Set([
         'advantage',
         'automaticFailure',
      ]);

      expect(reinitializeCheckOptions(checkOptions, touchedFields, 'attribute')).toEqual({
         advantage: 2,
         attribute: 'body',
         automaticFailure: true,
         skill: 'none',
      });
   });

   it('leaves non-derived fields (identity, item data, situations) untouched', () => {
      /** @type {object} A fully-resolved options object for an Attack Check. */
      const checkOptions = {
         advantage: 0,
         attackIdx: 0,
         attribute: 'body',
         automaticFailure: false,
         damageMod: 1,
         diceMod: 2,
         expertiseMod: 3,
         itemId: 'weapon1',
         situations: ['underwater'],
         skill: 'melee',
         trainingMod: 4,
         type: 'melee',
      };

      expect(reinitializeCheckOptions(checkOptions, new Set(), 'attack')).toEqual({
         attackIdx: 0,
         attribute: 'body',
         itemId: 'weapon1',
         situations: ['underwater'],
         skill: 'melee',
         type: 'melee',
      });
   });

   it('is a no-op for an unknown check type', () => {
      /** @type {object} An options object without a recognized check type. */
      const checkOptions = {
         advantage: 1,
         diceMod: 2,
      };

      expect(reinitializeCheckOptions(checkOptions, new Set(), 'unknown')).toEqual(checkOptions);
   });
});

describe('rederiveActorCheckOptionFields', () => {
   it('returns the re-derived options when an untouched derived field changed', () => {
      /** @type {object} The current, fully-resolved options: an always-on Disadvantage was active at dialog open. */
      const currentOptions = {
         advantage: -1,
         attribute: 'body',
         automaticFailure: false,
         diceMod: 0,
         expertiseMod: 0,
         skill: 'none',
         trainingMod: 0,
      };

      /** @type {(options: object) => object} Stands in for the live Actor: Advantage is now -2. */
      const initialize = (options) => ({
         ...currentOptions,
         ...options,
         advantage: options.advantage ?? -2,
      });

      expect(rederiveActorCheckOptionFields(currentOptions, new Set(), 'attribute', initialize)).toEqual({
         ...currentOptions,
         advantage: -2,
      });
   });

   it('returns undefined when nothing actually changed', () => {
      /** @type {object} The current, fully-resolved options. */
      const currentOptions = {
         advantage: 0,
         attribute: 'body',
         automaticFailure: false,
         diceMod: 0,
         expertiseMod: 0,
         skill: 'none',
         trainingMod: 0,
      };

      /** @type {(options: object) => object} Stands in for the live Actor: nothing about it changed. */
      const initialize = (options) => ({
         ...currentOptions,
         ...options,
      });

      expect(rederiveActorCheckOptionFields(currentOptions, new Set(), 'attribute', initialize)).toBeUndefined();
   });

   it('keeps a touched field even when the live Actor would derive something else', () => {
      /** @type {object} The current options: the user picked Greater Advantage (2) in the dialog. */
      const currentOptions = {
         advantage: 2,
         attribute: 'body',
         automaticFailure: false,
         diceMod: 0,
         expertiseMod: 0,
         skill: 'none',
         trainingMod: 0,
      };

      /** @type {(options: object) => object} Stands in for the live Actor: would derive Disadvantage (-1). */
      const initialize = (options) => ({
         ...currentOptions,
         ...options,
         advantage: options.advantage ?? -1,
      });

      /** @type {Set<string>} The user has edited Advantage. */
      const touchedFields = new Set(['advantage']);

      expect(rederiveActorCheckOptionFields(currentOptions, touchedFields, 'attribute', initialize))
         .toBeUndefined();
   });
});

describe('Attack actor-derived fields (attackerMelee/attackerAccuracy/targetDefense)', () => {
   it('includes Melee, Accuracy, and target Defense in the Attack field list', () => {
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.attack).toEqual(expect.arrayContaining([
         'attackerMelee',
         'attackerAccuracy',
         'targetDefense',
      ]));
   });

   it('re-derives targetDefense when nothing is targeted (the no-target self-fallback)', () => {
      /** @type {object} An Attack Check's current options; no target is selected. */
      const checkOptions = {
         attackerAccuracy: 3,
         attackerMelee: 3,
         itemId: 'weapon1',
         targetDefense: 3,
      };

      globalThis.game.user.targets = new Set();

      expect(reinitializeCheckOptions(checkOptions, new Set(), 'attack')).toEqual({ itemId: 'weapon1' });
   });

   it('leaves a targeted character\'s Defense alone even when untouched', () => {
      /** @type {object} An Attack Check's current options; a target is selected. */
      const checkOptions = {
         attackerAccuracy: 3,
         attackerMelee: 3,
         itemId: 'weapon1',
         targetDefense: 5,
      };

      /** @type {Set} Stands in for a targeted token: only its length is read by getTargetedCharacters. */
      globalThis.game.user.targets = new Set([{ actor: { system: { isCharacter: true } } }]);

      expect(reinitializeCheckOptions(checkOptions, new Set(), 'attack')).toMatchObject({ targetDefense: 5 });

      globalThis.game.user.targets = new Set();
   });
});

describe('seedTouchedFieldsFromCallerOptions', () => {
   it('marks every field the caller explicitly set (not undefined) as touched', () => {
      /** @type {Set<string>} The dialog's touched-field set, seeded fresh. */
      const touchedFields = new Set();

      seedTouchedFieldsFromCallerOptions(touchedFields, {
         attribute: 'body',
         automaticFailure: undefined,
         diceMod: 3,
      });

      expect(touchedFields.has('diceMod')).toBe(true);
      expect(touchedFields.has('attribute')).toBe(true);
      expect(touchedFields.has('automaticFailure')).toBe(false);
   });

   it('is a no-op when the caller supplied no options', () => {
      /** @type {Set<string>} The dialog's touched-field set, seeded fresh. */
      const touchedFields = new Set();
      seedTouchedFieldsFromCallerOptions(touchedFields, undefined);
      expect(touchedFields.size).toBe(0);
   });
});

describe('INITIALIZE_CHECK_OPTIONS_METHODS', () => {
   it('names the live Actor\'s initializer method for every check type', () => {
      expect(INITIALIZE_CHECK_OPTIONS_METHODS).toEqual({
         attack: 'initializeAttackCheckOptions',
         attribute: 'initializeAttributeCheckOptions',
         casting: 'initializeCastingCheckOptions',
         item: 'initializeItemCheckOptions',
         resistance: 'initializeResistanceCheckOptions',
      });
   });
});
