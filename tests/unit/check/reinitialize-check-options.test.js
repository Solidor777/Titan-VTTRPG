import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import reinitializeCheckOptions, {
   ACTOR_DERIVED_CHECK_OPTION_FIELDS,
   INITIALIZE_CHECK_OPTIONS_METHODS,
   rederiveActorCheckOptionFields,
   seedTargetDefenseProvenance,
   seedTouchedFieldsFromCallerOptions,
} from '~/check/dialog/ReinitializeCheckOptions.js';

beforeAll(() => {
   // seedTargetDefenseProvenance reads getTargetedCharacters(), which reads these globals.
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
         doubleTraining: true,
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
         doubleTraining: true,
         itemId: 'weapon1',
         situations: ['underwater'],
         skill: 'melee',
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

      /**
       * Stands in for the live Actor's `initialize<Type>CheckOptions`: Advantage is now -2.
       * @type {(options: object) => object}
       */
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

      /**
       * Stands in for the live Actor's `initialize<Type>CheckOptions`: nothing about it changed.
       * @type {(options: object) => object}
       */
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

      /**
       * Stands in for the live Actor's `initialize<Type>CheckOptions`: would derive Disadvantage (-1).
       * @type {(options: object) => object}
       */
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

   it('includes the owned-weapon-derived defaults in the Attack field list', () => {
      expect(ACTOR_DERIVED_CHECK_OPTION_FIELDS.attack).toEqual(expect.arrayContaining([
         'multiAttack',
         'plusExtraSuccessDamage',
         'type',
         'range',
         'cleave',
         'flurry',
         'ineffective',
         'magical',
         'rend',
         'penetrating',
      ]));
   });

   it('has no per-pass targetDefense guard: an untouched field is always re-derived regardless of live ' +
      'targeting', () => {
      /** @type {object} An Attack Check's current options; a target happens to be selected right now. */
      const checkOptions = {
         attackerAccuracy: 3,
         attackerMelee: 3,
         itemId: 'weapon1',
         targetDefense: 5,
      };

      // Live targeting state must not matter to reinitializeCheckOptions itself: provenance is decided once, at
      // mount, by seedTargetDefenseProvenance (see the describe block below) — never re-checked here.
      globalThis.game.user.targets = new Set([{ actor: { system: { isCharacter: true } } }]);

      expect(reinitializeCheckOptions(checkOptions, new Set(), 'attack')).toEqual({ itemId: 'weapon1' });

      globalThis.game.user.targets = new Set();
   });
});

describe('seedTargetDefenseProvenance', () => {
   it('marks targetDefense touched when something is targeted at mount, so removing the target afterward ' +
      'keeps the target\'s Defense', () => {
      /** @type {Set<string>} The dialog's touched-field set, seeded fresh. */
      const touchedFields = new Set();

      // A target is selected at dialog mount: targetDefense's resolved value came from that target's own Defense
      // rating, not from the rolling Actor. getTargetedCharacters() filters on `target.actor?.system.isCharacter`,
      // so the stand-in token needs that shape (not just Set membership/length).
      globalThis.game.user.targets = new Set([{ actor: { system: { isCharacter: true } } }]);
      seedTargetDefenseProvenance(touchedFields, {});
      expect(touchedFields.has('targetDefense')).toBe(true);

      // The target is removed after mount; targetDefense stays touched, so reinitializeCheckOptions keeps the
      // target's Defense instead of overwriting it with the no-target self-fallback.
      globalThis.game.user.targets = new Set();
      /** @type {object} The dialog's current options, still carrying the target's Defense (5). */
      const checkOptions = {
         attackerAccuracy: 3,
         attackerMelee: 3,
         itemId: 'weapon1',
         targetDefense: 5,
      };
      expect(reinitializeCheckOptions(checkOptions, touchedFields, 'attack')).toMatchObject({ targetDefense: 5 });
   });

   it('leaves targetDefense untouched when nothing is targeted at mount, so it keeps following once ' +
      'something is targeted later', () => {
      /** @type {Set<string>} The dialog's touched-field set, seeded fresh. */
      const touchedFields = new Set();

      // Nothing is targeted at mount: targetDefense's resolved value is the no-target self-fallback.
      globalThis.game.user.targets = new Set();
      seedTargetDefenseProvenance(touchedFields, {});
      expect(touchedFields.has('targetDefense')).toBe(false);

      // Something is targeted later, while the dialog is still open; targetDefense stays untouched (provenance
      // was decided once, at mount), so it keeps re-deriving on every pass — including picking up the newly
      // targeted character's own Defense.
      globalThis.game.user.targets = new Set([{ actor: { system: { isCharacter: true } } }]);
      /** @type {object} The dialog's current options, still carrying the earlier self-fallback value (3). */
      const checkOptions = {
         attackerAccuracy: 3,
         attackerMelee: 3,
         itemId: 'weapon1',
         targetDefense: 3,
      };
      expect(reinitializeCheckOptions(checkOptions, touchedFields, 'attack')).toEqual({ itemId: 'weapon1' });

      globalThis.game.user.targets = new Set();
   });

   it('defers to the caller\'s own explicit targetDefense instead of touching it a second time', () => {
      /**
       * The dialog's touched-field set: seeding from callerOptions already ran (elsewhere) and marked
       * targetDefense touched, exactly as seedTouchedFieldsFromCallerOptions would.
       * @type {Set<string>}
       */
      const touchedFields = new Set(['targetDefense']);
      globalThis.game.user.targets = new Set([{ actor: { system: { isCharacter: true } } }]);

      // The caller explicitly supplied targetDefense: this function must not need to (and does not) touch it
      // itself — it only adds the key when the caller left it undefined and something is targeted.
      seedTargetDefenseProvenance(touchedFields, { targetDefense: 7 });

      expect(touchedFields.has('targetDefense')).toBe(true);
      expect(touchedFields.size).toBe(1);

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
