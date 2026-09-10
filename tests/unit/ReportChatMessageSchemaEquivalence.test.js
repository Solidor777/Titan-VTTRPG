import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   MockNumberField,
   MockSchemaField,
   MockStringField,
   installSchemaMocks,
   restoreSchemaMocks,
} from './helpers/schemaFingerprint.js';

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
   // Flat-resource report leaves (damage, healing, spend-resolve, long-rest). The resource snapshots
   // (resource.stamina/wounds/resolve) nest under a `resource` SchemaField, at the same path as the
   // actor's own persisted resources; the damage tags container is conditionally present, so the shape
   // factory declares it null -> nullable ObjectField, preserving the cards' if (obj) guards. Each key's
   // nested resource sub-fields are asserted separately below (RESOURCE_FIELDS).
   damageReport: {
      damageTaken: { type: 'NumberField' }, damageResisted: { type: 'NumberField' },
      staminaLost: { type: 'NumberField' }, woundsSuffered: { type: 'NumberField' },
      ignoredArmor: { type: 'BooleanField' },
      resource: { type: 'SchemaField' },
      tags: { type: 'ObjectField', nullable: true },
   },
   healingReport: {
      staminaRestored: { type: 'NumberField' },
      resource: { type: 'SchemaField' },
   },
   spendResolveReport: {
      resolveSpent: { type: 'NumberField' }, resolveShortage: { type: 'NumberField' },
      resource: { type: 'SchemaField' },
   },
   longRestReport: {
      woundsHealed: { type: 'NumberField' },
      resource: { type: 'SchemaField' },
   },

   // Task 2b: armor report leaves (rend, repairs). The armor resource snapshot is conditionally
   // present, so the shape factory declares it null -> nullable ObjectField, preserving the cards'
   // if (armor) guards.
   rendReport: {
      armorImg: { type: 'StringField' }, armorName: { type: 'StringField' },
      rend: { type: 'NumberField' },
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

   // Turn report leaves (turn-start, turn-end). Every conditionally-present compound is a nullable
   // ObjectField (null in the shape), preserving the cards' if (obj) guards; fastHealing and
   // persistentDamage stay opaque to keep their variable per-source keys. The resource snapshots nest
   // under a `resource` SchemaField, asserted separately below (RESOURCE_FIELDS). The message (both) and
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
      resource: { type: 'SchemaField' },
      message: { type: 'ArrayField' },
      conditions: { type: 'ArrayField' },
   },
   turnEndReport: {
      expiredEffectsRemoved: { type: 'BooleanField' },
      effects: { type: 'ObjectField', nullable: true },
      fastHealing: { type: 'ObjectField', nullable: true },
      persistentDamage: { type: 'ObjectField', nullable: true },
      resource: { type: 'SchemaField' },
      message: { type: 'ArrayField' },
   },

   // Revert + expired report leaves (turn-start-revert, turn-end-revert, effects-expired). Every
   // conditionally-present compound is a nullable ObjectField (null in the shape), preserving the cards'
   // if (obj) guards: the revert confirm-offer objects (fastHealingRevert/persistentDamageRevert/
   // resolveRegainRevert). The resource snapshots nest under a `resource` SchemaField, asserted
   // separately below (RESOURCE_FIELDS); turn-end-revert carries neither resolveRegainRevert nor a
   // resolve snapshot (turn end never regains or reports resolve). The effects-expired report's only
   // always-present field is the boolean expired-effects flag.
   turnStartRevertReport: {
      fastHealingRevert: { type: 'ObjectField', nullable: true },
      persistentDamageRevert: { type: 'ObjectField', nullable: true },
      resolveRegainRevert: { type: 'ObjectField', nullable: true },
      resource: { type: 'SchemaField' },
   },
   turnEndRevertReport: {
      fastHealingRevert: { type: 'ObjectField', nullable: true },
      persistentDamageRevert: { type: 'ObjectField', nullable: true },
      resource: { type: 'SchemaField' },
   },
   effectsExpiredReport: {
      expiredEffectsRemoved: { type: 'BooleanField' },
      effects: { type: 'ObjectField', nullable: true },
   },
};

/**
 * The set of nested `resource` sub-fields declared by each report leaf that snapshots a resource, at
 * the same paths as the actor's own persisted resources. Every entry is a nullable ObjectField
 * (preserving the cards' `if (obj)` presence guards); a report leaf absent from this map declares no
 * `resource` field at all.
 * @type {Record<string, string[]>}
 */
const RESOURCE_FIELDS = {
   damageReport: ['stamina', 'wounds'],
   healingReport: ['stamina', 'wounds'],
   spendResolveReport: ['resolve'],
   longRestReport: ['wounds'],
   turnStartReport: ['stamina', 'wounds', 'resolve'],
   turnEndReport: ['stamina', 'wounds'],
   turnStartRevertReport: ['stamina', 'wounds', 'resolve'],
   turnEndRevertReport: ['stamina', 'wounds'],
};

beforeAll(async () => {
   // Install the shared Foundry stand-ins (i18n, TypeDataModel, data fields, ApplicationV2).
   installSchemaMocks();

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
   restoreSchemaMocks();
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

      // Every report that snapshots a resource nests it under `resource`, at the same paths as the
      // actor's own persisted resources; each sub-field is a nullable ObjectField.
      if (RESOURCE_FIELDS[key]) {
         it(`${key} resource sub-fields match the golden master`, () => {
            const schema = models[key]._defineDocumentSchema();

            expect(schema.resource).toBeInstanceOf(MockSchemaField);
            for (const name of RESOURCE_FIELDS[key]) {
               const field = schema.resource.fields[name];
               expect(field, `missing resource field ${name}`).toBeTruthy();
               expect(field.constructor.name, `${key}.resource.${name} type`).toBe('MockObjectField');
               expect(Boolean(field.options?.nullable), `${key}.resource.${name} nullable`).toBe(true);
            }

            // No unexpected nested resource fields.
            expect(Object.keys(schema.resource.fields).sort()).toEqual([...RESOURCE_FIELDS[key]].sort());
         });
      }
   }
});
