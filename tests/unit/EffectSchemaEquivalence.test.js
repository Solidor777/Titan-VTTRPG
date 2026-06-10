import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   MockField,
   emptyObjectArray,
   fingerprintSchema,
   installSchemaMocks,
   integerField,
   numberField,
   objectElement,
   restoreSchemaMocks,
   sortFingerprint,
   stringField,
} from './helpers/schemaFingerprint.js';

// Golden-master gate for the effect schemas. Phase 4 refactors TitanActiveEffectDataModel to build
// its duration/check/customTrait fields from the new createEffectSystemTemplate() shape (via
// buildSchemaFromShape) and adds EffectChatMessageDataModel, whose snapshot schema builds from the
// same template. This suite freezes a byte-exact fingerprint of the LIVE Active Effect schema
// (DATA-INTEGRITY SENSITIVE: effects persist in worlds) authored from the CURRENT hand-built code,
// so the refactor can be proven to leave the persisted data shape unchanged, and pins the chat
// snapshot schema the same way. The fingerprint omits array-element initials by design: an array
// element's initial is inert (Foundry populates the array from the array's own initial, never the
// element's), so the hand-built element factories (e.g. createObjectField(() =>
// createItemCheckTemplate())) and the shape-built bare createObjectField() elements compare equal.
// The harness mirrors ItemDataModelSchemaEquivalence.test.js, adding a DataField stand-in (the AE
// changes field uses createDataField). Dynamic import is permitted in tests (the no-dynamic-import
// rule governs the shipping bundle only).

/** Stand-in for DataField, a distinct subclass so the produced field type can be asserted. */
class MockDataField extends MockField {}

/** @type {object} Holds the dynamically imported effect DataModel classes keyed by a stable name. */
const models = {};

beforeAll(async () => {
   // Install the shared Foundry stand-ins (i18n, TypeDataModel, data fields, ApplicationV2), then add
   // this suite's extras: an inert settings.get and the DataField stand-in (the AE changes field uses
   // createDataField).
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => undefined,
   };
   globalThis.foundry.data.fields.DataField = MockDataField;

   // Dynamically import the live Active Effect data model against the installed stand-ins.
   models.effect = (
      await import('~/document/types/active-effect/TitanActiveEffectDataModel.js')
   ).default;

   // Dynamically import the effect chat-message snapshot data model against the same stand-ins.
   models.effectChat = (
      await import('~/document/types/active-effect/chat-message/EffectChatMessageDataModel.js')
   ).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   restoreSchemaMocks();
});

/**
 * Builds the golden fingerprint of a required, non-nullable DataField — the shape produced by
 * createDataField (the permissive value field inside the AE changes element).
 * @param {*} initial - The initial value.
 * @returns {object} The fingerprint of a DataField.
 */
function dataField(initial) {
   return {
      initial,
      kind: 'DataField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of the custom Titan duration SchemaField — the shape shared by the
 * live Active Effect schema and the effect chat-message snapshot schema (both sourced from
 * createEffectSystemTemplate()). createSchemaField passes no options, so no `required` option is
 * declared and the fingerprint records the harness default `false`.
 * @returns {object} The fingerprint of the duration SchemaField.
 */
function durationField() {
   return {
      fields: {
         custom: stringField(''),
         initiative: integerField(1),
         remaining: integerField(1),
         type: stringField('turnStart'),
      },
      kind: 'SchemaField',
      nullable: false,
      required: false,
   };
}

/**
 * The committed golden fingerprint of the LIVE Titan Active Effect ('effect' subtype) schema, frozen
 * from the hand-built code BEFORE the shape-template refactor. Any divergence after the refactor
 * signals a change to the persisted Active Effect data shape. The changes field is hand-built in the
 * data model (the Foundry v14 verifier requires an ArrayField of a typed SchemaField, which a shape
 * cannot express) and is expected to remain byte-identical.
 * @type {object}
 */
const EFFECT_DATA_MODEL_GOLDEN = {
   changes: {
      element: {
         fields: {
            key: stringField(''),
            mode: integerField(0),
            phase: stringField(''),
            priority: integerField(0),
            type: stringField(''),
            value: dataField(''),
         },
         kind: 'SchemaField',
         nullable: false,
         required: false,
      },
      initial: [],
      kind: 'ArrayField',
      nullable: false,
      required: true,
   },
   check: emptyObjectArray(),
   customTrait: emptyObjectArray(),
   documentVersion: numberField(0),
   duration: durationField(),
   rulesElement: emptyObjectArray(),
};

/**
 * The committed golden fingerprint of the effect chat-message snapshot schema: the effect system
 * shape (duration/check/customTrait), the rules-element fragment, and the snapshot-only string
 * fields (description from the native ActiveEffect field; name and img as label metadata). Authored
 * from the shape templates (NOT derived from the schema, to avoid circularity).
 * @type {object}
 */
const EFFECT_CHAT_GOLDEN = {
   check: emptyObjectArray(),
   customTrait: emptyObjectArray(),
   description: stringField(''),
   documentVersion: numberField(0),
   duration: durationField(),
   img: stringField(''),
   name: stringField(''),
   rulesElement: emptyObjectArray(),
};

describe('effect schema characterization (golden master)', () => {
   it('the live TitanActiveEffectDataModel schema fingerprint matches the committed golden', () => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models.effect._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(EFFECT_DATA_MODEL_GOLDEN));
   });

   it('the EffectChatMessageDataModel snapshot schema fingerprint matches the committed golden', () => {
      // Fingerprint the chat snapshot schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models.effectChat._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(EFFECT_CHAT_GOLDEN));
   });
});
