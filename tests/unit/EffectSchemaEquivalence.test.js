import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   emptyObjectArray,
   fingerprintSchema,
   installSchemaMocks,
   integerField,
   numberField,
   restoreSchemaMocks,
   sortFingerprint,
   stringField,
} from './helpers/schemaFingerprint.js';

// Golden-master gate for the effect schemas. It freezes a byte-exact fingerprint of the LIVE Active Effect
// schema (DATA-INTEGRITY SENSITIVE: effects persist in worlds), whose duration/check/customTrait fields are built
// from createEffectSystemTemplate() via buildSchemaFromShape, and pins the effect chat-message snapshot schema
// built from the same template. The fingerprint omits array-element initials by design: an array element's
// initial is inert (Foundry populates the array from the array's own initial, never the element's), so
// hand-built element factories and the shape-built bare createObjectField() elements compare equal. The core
// `changes` field is inherited from foundry.data.ActiveEffectTypeDataModel through TitanDataModelMixin and is not
// part of _defineDocumentSchema(); tests/unit/TitanDataModelMixin.test.js covers the merge. The harness mirrors
// ItemDataModelSchemaEquivalence.test.js. Dynamic import is permitted in tests (the no-dynamic-import rule
// governs the shipping bundle only).

/** @type {object} Holds the dynamically imported effect DataModel classes keyed by a stable name. */
const models = {};

beforeAll(async () => {
   // Install the shared Foundry stand-ins (i18n, TypeDataModel, data fields, ApplicationV2), then add
   // this suite's extra: an inert settings.get.
   installSchemaMocks();
   globalThis.game.settings = {
      get: () => undefined,
   };

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
 * Builds the golden fingerprint of the custom Titan duration SchemaField — the shape shared by the
 * live Active Effect schema and the effect chat-message snapshot schema (both sourced from
 * createEffectSystemTemplate()). `createSchemaField` passes no options, so no `required` option is
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
 * signals a change to the persisted Active Effect data shape. The core `changes` field is inherited
 * and absent from this fingerprint.
 * @type {object}
 */
const EFFECT_DATA_MODEL_GOLDEN = {
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
