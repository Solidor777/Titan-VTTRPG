import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Golden-master gate for the report chat-message family. Phase 3 converts the 13 legacy report chat
// messages into first-class ChatMessage subtypes, each a leaf DataModel whose static
// _defineDocumentSchema() builds its typed system fields from a co-located shape factory. This suite
// freezes a hand-authored expectation of every report leaf's schema (field constructor name +
// nullability) so each leaf task can prove its typed schema matches what the producer + shape factory
// declare. The expectation is authored by reading the producer/shape factory (NOT derived from the
// schema, to avoid circularity); each leaf task (2a-2e) appends its entry to EXPECTED below.
//
// The report DataModels chain through TitanChatMessageDataModel -> TitanDataModel ->
// foundry.abstract.TypeDataModel and define their schema via the create*Field helpers, which call
// foundry.data.fields.*. The unit env (tests/setup.js) installs only a minimal foundry stub, so this
// suite installs stand-ins for TypeDataModel and the data-field classes before dynamically importing
// the real data models (matching ItemDataModelSchemaEquivalence.test.js). Dynamic import is permitted
// in tests (the no-dynamic-import rule governs the shipping bundle only); the family base is imported
// dynamically in beforeAll, after the stand-ins are installed.

/**
 * Minimal stand-in for a Foundry DataField that records the options it was constructed with, so the
 * harness can read the declared required/nullable/initial the create*Field helpers pass.
 */
class MockField {
   /**
    * Stores the field options.
    * @param {object} options - The field configuration (e.g. initial, nullable, integer).
    */
   constructor(options = {}) {
      /** @type {object} The field configuration. */
      this.options = options;
   }
}

/** Stand-in for StringField, a distinct subclass so the produced field type can be asserted. */
class MockStringField extends MockField {}

/** Stand-in for NumberField, a distinct subclass so the produced field type can be asserted. */
class MockNumberField extends MockField {}

/** Stand-in for BooleanField, a distinct subclass so the produced field type can be asserted. */
class MockBooleanField extends MockField {}

/** Stand-in for ObjectField, a distinct subclass so the produced field type can be asserted. */
class MockObjectField extends MockField {}

/** Stand-in for ArrayField that captures its element field as the first constructor argument. */
class MockArrayField extends MockField {
   /**
    * Stores the element field and options.
    * @param {MockField} element - The field describing each array element.
    * @param {object} options - The array field configuration.
    */
   constructor(element, options = {}) {
      super(options);
      /** @type {MockField} The element field. */
      this.element = element;
   }
}

/** Stand-in for SchemaField that captures its sub-fields map as the first constructor argument. */
class MockSchemaField extends MockField {
   /**
    * Stores the sub-fields map and options.
    * @param {object} fields - The map of sub-field name to MockField.
    * @param {object} options - The schema field configuration.
    */
   constructor(fields, options = {}) {
      super(options);
      /** @type {object} The map of sub-field name to MockField. */
      this.fields = fields;
   }
}

/** Stand-in for TypeDataModel so the data-model classes can be declared and their statics invoked. */
class MockTypeDataModel {}

/** @type {object} Holds the dynamically imported report family base, keyed by a stable name. */
const models = {};

/**
 * Hand-authored expectation of each report leaf's schema. For each subtype key, maps every top-level
 * system field to a descriptor: { type: <constructor name>, nullable?: boolean }. Authored by reading
 * the producer + shape factory (NOT derived from the schema, to avoid circularity). Leaf tasks 2a-2e
 * append their entries; the shared base fields actorName/actorImg are asserted via the base test below
 * and ignored in each leaf's extra-field check.
 * @type {Record<string, Record<string, {type: string, nullable?: boolean}>>}
 */
const EXPECTED = {
   // Task 2a: flat-resource report leaves (damage, healing, spend-resolve, long-rest). The resource
   // snapshots (stamina/wounds/resolve) and the damage tags container are conditionally present, so the
   // shape factory declares them null -> nullable ObjectField, preserving the cards' if (obj) guards.
   damageReport: {
      damageTaken: { type: 'NumberField' }, damageResisted: { type: 'NumberField' },
      staminaLost: { type: 'NumberField' }, woundsSuffered: { type: 'NumberField' },
      ignoredArmor: { type: 'BooleanField' },
      stamina: { type: 'ObjectField', nullable: true }, wounds: { type: 'ObjectField', nullable: true },
      tags: { type: 'ObjectField', nullable: true },
   },
   healingReport: {
      staminaRestored: { type: 'NumberField' },
      stamina: { type: 'ObjectField', nullable: true }, wounds: { type: 'ObjectField', nullable: true },
   },
   spendResolveReport: {
      resolveSpent: { type: 'NumberField' }, resolveShortage: { type: 'NumberField' },
      resolve: { type: 'ObjectField', nullable: true },
   },
   longRestReport: {
      woundsHealed: { type: 'NumberField' },
      wounds: { type: 'ObjectField', nullable: true },
   },

   // Task 2b: armor report leaves (rend, repairs). The armor resource snapshot is conditionally
   // present, so the shape factory declares it null -> nullable ObjectField, preserving the cards'
   // if (armor) guards.
   rendReport: {
      armorImg: { type: 'StringField' }, armorName: { type: 'StringField' },
      armorLost: { type: 'NumberField' }, armor: { type: 'ObjectField', nullable: true },
   },
   repairsReport: {
      armorImg: { type: 'StringField' }, armorName: { type: 'StringField' },
      armorRepaired: { type: 'NumberField' }, armor: { type: 'ObjectField', nullable: true },
   },

   // Task 2c: header-only report leaves (remove-combat-effects, short-rest). These carry no payload
   // beyond the shared report label fields, so their shape factories are empty and their field maps are
   // empty here; the per-leaf "no unexpected extra fields" guard asserts only the base fields exist.
   removeCombatEffectsReport: {},
   shortRestReport: {},

   // Task 2d: turn report leaves (turn-start, turn-end). Every conditionally-present compound is a
   // nullable ObjectField (null in the shape), preserving the cards' if (obj) guards; fastHealing and
   // persistentDamage stay opaque to keep their variable per-source keys. The message (both) and
   // conditions (turn-start only) array fields are explicit ArrayFields, declared on the data model
   // rather than in the shape, because Foundry's ObjectField rejects arrays. The message element is a
   // StringField (the producer pushes HTML strings); the harness asserts the ArrayField type only (no
   // nullability), so the element type is not re-asserted here.
   turnStartReport: {
      expiredEffectsRemoved: { type: 'BooleanField' },
      effects: { type: 'ObjectField', nullable: true },
      fastHealing: { type: 'ObjectField', nullable: true },
      persistentDamage: { type: 'ObjectField', nullable: true },
      resolveRegain: { type: 'ObjectField', nullable: true },
      stamina: { type: 'ObjectField', nullable: true },
      wounds: { type: 'ObjectField', nullable: true },
      resolve: { type: 'ObjectField', nullable: true },
      message: { type: 'ArrayField' },
      conditions: { type: 'ArrayField' },
   },
   turnEndReport: {
      expiredEffectsRemoved: { type: 'BooleanField' },
      effects: { type: 'ObjectField', nullable: true },
      fastHealing: { type: 'ObjectField', nullable: true },
      persistentDamage: { type: 'ObjectField', nullable: true },
      stamina: { type: 'ObjectField', nullable: true },
      wounds: { type: 'ObjectField', nullable: true },
      message: { type: 'ArrayField' },
   },

   // Task 2e: revert + expired report leaves (turn-start-revert, turn-end-revert, effects-expired).
   // Every conditionally-present compound is a nullable ObjectField (null in the shape), preserving the
   // cards' if (obj) guards: the revert confirm-offer objects (fastHealingRevert/persistentDamageRevert/
   // resolveRegainRevert) and the resource snapshots (stamina/wounds/resolve). Turn-end-revert carries
   // neither resolveRegainRevert nor resolve (turn end never regains or reports resolve). The
   // effects-expired report's only always-present field is the boolean expired-effects flag.
   turnStartRevertReport: {
      fastHealingRevert: { type: 'ObjectField', nullable: true },
      persistentDamageRevert: { type: 'ObjectField', nullable: true },
      resolveRegainRevert: { type: 'ObjectField', nullable: true },
      stamina: { type: 'ObjectField', nullable: true },
      wounds: { type: 'ObjectField', nullable: true },
      resolve: { type: 'ObjectField', nullable: true },
   },
   turnEndRevertReport: {
      fastHealingRevert: { type: 'ObjectField', nullable: true },
      persistentDamageRevert: { type: 'ObjectField', nullable: true },
      stamina: { type: 'ObjectField', nullable: true },
      wounds: { type: 'ObjectField', nullable: true },
   },
   effectsExpiredReport: {
      expiredEffectsRemoved: { type: 'BooleanField' },
      effects: { type: 'ObjectField', nullable: true },
   },
};

beforeAll(async () => {
   // The create*Field helpers call localize() (game.i18n) when a schema is built. Provide pass-through
   // i18n so any field label lookups resolve during schema construction.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
   };

   // Install the TypeDataModel and data-field stand-ins before importing the data models.
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
   globalThis.foundry.data = {
      fields: {
         StringField: MockStringField,
         NumberField: MockNumberField,
         BooleanField: MockBooleanField,
         ObjectField: MockObjectField,
         ArrayField: MockArrayField,
         SchemaField: MockSchemaField,
      },
   };

   // Dynamically import the report family base against the installed stand-ins. Leaf tasks 2a-2e import
   // their concrete report DataModels here as well.
   models.base = (
      await import('~/document/types/chat-message/report/ReportChatMessageDataModel.js')
   ).default;

   // Task 2a: the flat-resource report leaves (damage, healing, spend-resolve, long-rest).
   models.damageReport = (
      await import('~/document/types/chat-message/report/types/damage/DamageReportChatMessageDataModel.js')
   ).default;
   models.healingReport = (
      await import('~/document/types/chat-message/report/types/healing/HealingReportChatMessageDataModel.js')
   ).default;
   models.spendResolveReport = (
      await import(
         '~/document/types/chat-message/report/types/spend-resolve/SpendResolveReportChatMessageDataModel.js'
      )
   ).default;
   models.longRestReport = (
      await import('~/document/types/chat-message/report/types/long-rest/LongRestReportChatMessageDataModel.js')
   ).default;

   // Task 2b: the armor report leaves (rend, repairs).
   models.rendReport = (
      await import('~/document/types/chat-message/report/types/rend/RendReportChatMessageDataModel.js')
   ).default;
   models.repairsReport = (
      await import('~/document/types/chat-message/report/types/repairs/RepairsReportChatMessageDataModel.js')
   ).default;

   // Task 2c: the header-only report leaves (remove-combat-effects, short-rest).
   models.removeCombatEffectsReport = (
      await import(
         '~/document/types/chat-message/report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessageDataModel.js'
      )
   ).default;
   models.shortRestReport = (
      await import(
         '~/document/types/chat-message/report/types/short-rest-report/ShortRestReportChatMessageDataModel.js'
      )
   ).default;

   // Task 2d: the turn report leaves (turn-start, turn-end).
   models.turnStartReport = (
      await import('~/document/types/chat-message/report/types/turn-start/TurnStartReportChatMessageDataModel.js')
   ).default;
   models.turnEndReport = (
      await import('~/document/types/chat-message/report/types/turn-end/TurnEndReportChatMessageDataModel.js')
   ).default;

   // Task 2e: the revert + expired report leaves (turn-start-revert, turn-end-revert, effects-expired).
   models.turnStartRevertReport = (
      await import(
         '~/document/types/chat-message/report/types/turn-start-revert/TurnStartRevertReportChatMessageDataModel.js'
      )
   ).default;
   models.turnEndRevertReport = (
      await import(
         '~/document/types/chat-message/report/types/turn-end-revert/TurnEndRevertReportChatMessageDataModel.js'
      )
   ).default;
   models.effectsExpiredReport = (
      await import(
         '~/document/types/chat-message/report/types/effects-expired/EffectsExpiredReportChatMessageDataModel.js'
      )
   ).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.game;
});

describe('Report chat-message schema equivalence (golden master)', () => {
   it('the family base defines actorName and actorImg as StringFields', () => {
      // Build the base schema against the installed stand-ins and assert the shared label fields.
      const schema = models.base._defineDocumentSchema();
      expect(schema.actorName).toBeInstanceOf(MockStringField);
      expect(schema.actorImg).toBeInstanceOf(MockStringField);

      // The inherited documentVersion (built by TitanDataModel via createNumberField) must survive the
      // super._defineDocumentSchema() spread; this catches a future regression that drops the super call.
      expect(schema.documentVersion).toBeInstanceOf(MockNumberField);

      // No other fields should exist on the report family base.
      expect(Object.keys(schema).sort()).toEqual(['actorImg', 'actorName', 'documentVersion']);
   });

   for (const [key, fields] of Object.entries(EXPECTED)) {
      it(`${key} schema matches the golden master`, () => {
         // Build the leaf schema against the installed stand-ins.
         const schema = models[key]._defineDocumentSchema();

         // Every expected field must be present with the declared type (and nullability, when given).
         for (const [name, descriptor] of Object.entries(fields)) {
            const field = schema[name];
            expect(field, `missing field ${name}`).toBeTruthy();
            expect(field.constructor.name, `${key}.${name} type`).toBe(`Mock${descriptor.type}`);
            if (descriptor.nullable !== undefined) {
               expect(Boolean(field.options?.nullable), `${key}.${name} nullable`).toBe(descriptor.nullable);
            }
         }

         // No unexpected fields beyond the shared base label fields and the version field.
         const ignore = new Set(['actorName', 'actorImg', 'documentVersion']);
         const extra = Object.keys(schema).filter((field) => !ignore.has(field) && !(field in fields));
         expect(extra, `unexpected extra fields on ${key}`).toEqual([]);
      });
   }
});
