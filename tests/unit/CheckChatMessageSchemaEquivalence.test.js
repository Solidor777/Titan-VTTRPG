import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   booleanField,
   emptyObjectArray,
   fingerprintSchema,
   installSchemaMocks,
   integerField,
   numberField,
   objectElement,
   restoreSchemaMocks,
   schemaField,
   sortFingerprint,
   stringField,
} from './helpers/schemaFingerprint.js';

// Characterization (golden-master) gate for the five check chat-message DataModel schemas, authored as
// a RED test for follow-up D / Task 9. Task 10 will rebuild each subtype's _defineDocumentSchema() so
// that parameters and results are TYPED SchemaFields built from the shared check parameter/result shape
// templates via buildSchemaFromShape(); this suite freezes the byte-exact fingerprint of those TARGET
// typed schemas. It MUST FAIL against the current code, where CheckChatMessageDataModel stores both
// parameters and results as untyped ObjectField bags (createObjectField()). The check chat DataModels
// chain through CheckChatMessageDataModel -> TitanChatMessageDataModel -> TitanDataModel ->
// foundry.abstract.TypeDataModel, define their schema via the create*Field helpers (which call
// foundry.data.fields.*), and expose a component getter that imports a .svelte component. This suite
// installs stand-ins for TypeDataModel, the data-field classes, i18n, and ApplicationV2 before
// dynamically importing the real data models, then fingerprints each schema and asserts it deep-equals
// the committed golden written inline below. Dynamic import is permitted in tests (the
// no-dynamic-import rule governs the shipping bundle only).

/** @type {object} Holds the dynamically imported check chat-message DataModel classes keyed by type. */
const models = {};

beforeAll(async () => {
   // Install the shared Foundry stand-ins (i18n, TypeDataModel, data fields, ApplicationV2).
   installSchemaMocks();

   // Dynamically import every check chat-message DataModel against the installed stand-ins. The leaf
   // data models import their .svelte component for the component getter; the Svelte plugin compiles
   // those modules, and importing the compiled module does not execute the template, so the import
   // succeeds without rendering.
   models.attribute = (await import(
      '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js'
   )).default;
   models.resistance = (await import(
      '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js'
   )).default;
   models.attack = (await import(
      '~/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js'
   )).default;
   models.casting = (await import(
      '~/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js'
   )).default;
   models.item = (await import(
      '~/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js'
   )).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   restoreSchemaMocks();
});

/**
 * The shared base fingerprints every check chat-message DataModel inherits: documentVersion (from
 * TitanDataModel's _defineDocumentSchema, a non-integer NumberField initial 0) plus the
 * CheckChatMessageDataModel-level failuresReRolled boolean and the attached-message StringField array.
 * @returns {object} The fingerprints of the shared base fields keyed by field name.
 */
function checkBaseFields() {
   return {
      documentVersion: numberField(0),
      failuresReRolled: booleanField(false),
      message: {
         element: {
            kind: 'StringField',
            nullable: false,
            required: true,
         },
         initial: [],
         kind: 'ArrayField',
         nullable: false,
         required: true,
      },
   };
}

/**
 * The committed golden fingerprints for each check chat-message DataModel schema, hand-authored as the
 * TARGET typed schemas: parameters and results become SchemaFields whose sub-fields fingerprint each
 * field of the corresponding check parameter/result shape under the buildSchemaFromShape rules
 * (string -> StringField, number -> integer NumberField, boolean -> BooleanField, [] -> ObjectField
 * array, nested object -> SchemaField). This suite is RED against the current code, which stores
 * parameters and results as untyped ObjectFields.
 * @type {object}
 */
const GOLDENS = {
   // Attribute check: the simplest typed parameter set plus the base results with damageTaken.
   attribute: {
      ...checkBaseFields(),
      parameters: schemaField({
         attribute: stringField(''),
         attributeDice: integerField(0),
         complexity: integerField(0),
         damageToReduce: integerField(0),
         diceMod: integerField(0),
         difficulty: integerField(0),
         doubleExpertise: booleanField(false),
         doubleTraining: booleanField(false),
         expertiseMod: integerField(0),
         extraFailureOnCritical: booleanField(false),
         extraSuccessOnCritical: booleanField(false),
         skill: stringField(''),
         skillExpertise: integerField(0),
         skillTrainingDice: integerField(0),
         totalDice: integerField(0),
         totalExpertise: integerField(0),
         totalTrainingDice: integerField(0),
         trainingMod: integerField(0),
      }),
      results: schemaField({
         criticalFailures: integerField(0),
         criticalSuccesses: integerField(0),
         damageTaken: integerField(0),
         dice: emptyObjectArray(),
         expertiseRemaining: integerField(0),
         extraSuccesses: integerField(0),
         succeeded: booleanField(false),
         successes: integerField(0),
      }),
   },

   // Resistance check: a resistance-keyed parameter set; results mirror the attribute results.
   resistance: {
      ...checkBaseFields(),
      parameters: schemaField({
         complexity: integerField(0),
         damageToReduce: integerField(0),
         diceMod: integerField(0),
         difficulty: integerField(0),
         doubleExpertise: booleanField(false),
         expertiseMod: integerField(0),
         extraFailureOnCritical: booleanField(false),
         extraSuccessOnCritical: booleanField(false),
         resistance: stringField(''),
         resistanceDice: integerField(0),
         totalDice: integerField(0),
         totalExpertise: integerField(0),
      }),
      results: schemaField({
         criticalFailures: integerField(0),
         criticalSuccesses: integerField(0),
         damageTaken: integerField(0),
         dice: emptyObjectArray(),
         expertiseRemaining: integerField(0),
         extraSuccesses: integerField(0),
         succeeded: booleanField(false),
         successes: integerField(0),
      }),
   },

   // Attack check: parameters carry factory constants complexity:1 and difficulty:4, two object arrays
   // (attackTrait, customTrait), and the attack metadata; results add a damage field.
   attack: {
      ...checkBaseFields(),
      parameters: schemaField({
         attackNotes: stringField(''),
         attackerAccuracy: integerField(0),
         attackerMelee: integerField(0),
         attackName: stringField(''),
         attackerRating: integerField(0),
         attackTrait: emptyObjectArray(),
         attribute: stringField(''),
         attributeDice: integerField(0),
         cleave: booleanField(false),
         complexity: integerField(1),
         customTrait: emptyObjectArray(),
         damage: integerField(0),
         damageMod: integerField(0),
         diceMod: integerField(0),
         difficulty: integerField(4),
         doubleExpertise: booleanField(false),
         doubleTraining: booleanField(false),
         expertiseMod: integerField(0),
         extraFailureOnCritical: booleanField(false),
         extraSuccessOnCritical: booleanField(false),
         flurry: booleanField(false),
         img: stringField(''),
         ineffective: booleanField(false),
         itemName: stringField(''),
         magical: booleanField(false),
         multiAttack: booleanField(false),
         penetrating: booleanField(false),
         plusExtraSuccessDamage: booleanField(false),
         range: integerField(0),
         rend: booleanField(false),
         skill: stringField(''),
         skillExpertise: integerField(0),
         skillTrainingDice: integerField(0),
         targetDefense: integerField(0),
         totalDice: integerField(0),
         totalExpertise: integerField(0),
         totalTrainingDice: integerField(0),
         trainingMod: integerField(0),
         type: stringField(''),
      }),
      results: schemaField({
         criticalFailures: integerField(0),
         criticalSuccesses: integerField(0),
         damage: integerField(0),
         dice: emptyObjectArray(),
         expertiseRemaining: integerField(0),
         extraSuccesses: integerField(0),
         succeeded: booleanField(false),
         successes: integerField(0),
      }),
   },

   // Casting check: parameters carry a customTrait object array and a scalingAspect object array;
   // results add damage, healing, extraSuccessesRemaining, and a scalingAspect object array.
   casting: {
      ...checkBaseFields(),
      parameters: schemaField({
         attribute: stringField(''),
         attributeDice: integerField(0),
         complexity: integerField(0),
         customTrait: emptyObjectArray(),
         damage: integerField(0),
         damageMod: integerField(0),
         diceMod: integerField(0),
         difficulty: integerField(0),
         doubleExpertise: booleanField(false),
         doubleTraining: booleanField(false),
         expertiseMod: integerField(0),
         extraFailureOnCritical: booleanField(false),
         extraSuccessOnCritical: booleanField(false),
         healing: integerField(0),
         healingMod: integerField(0),
         img: stringField(''),
         itemDescription: stringField(''),
         itemName: stringField(''),
         reflexesCheck: booleanField(false),
         resilienceCheck: booleanField(false),
         scalingAspect: emptyObjectArray(),
         skill: stringField(''),
         skillExpertise: integerField(0),
         skillTrainingDice: integerField(0),
         totalDice: integerField(0),
         totalExpertise: integerField(0),
         totalTrainingDice: integerField(0),
         tradition: stringField(''),
         trainingMod: integerField(0),
         willpowerCheck: booleanField(false),
      }),
      results: schemaField({
         criticalFailures: integerField(0),
         criticalSuccesses: integerField(0),
         damage: integerField(0),
         dice: emptyObjectArray(),
         expertiseRemaining: integerField(0),
         extraSuccesses: integerField(0),
         extraSuccessesRemaining: integerField(0),
         healing: integerField(0),
         scalingAspect: emptyObjectArray(),
         succeeded: booleanField(false),
         successes: integerField(0),
      }),
   },

   // Item check: parameters carry the factory constant damageReducedBy:'none', a customTrait object
   // array, and a nested typed opposedCheck SchemaField; results add damage, healing, and
   // opposedCheckComplexity.
   item: {
      ...checkBaseFields(),
      parameters: schemaField({
         attribute: stringField(''),
         attributeDice: integerField(0),
         checkLabel: stringField(''),
         complexity: integerField(0),
         customTrait: emptyObjectArray(),
         damage: integerField(0),
         damageMod: integerField(0),
         damageReducedBy: stringField('none'),
         diceMod: integerField(0),
         difficulty: integerField(0),
         doubleExpertise: booleanField(false),
         doubleTraining: booleanField(false),
         expertiseMod: integerField(0),
         extraFailureOnCritical: booleanField(false),
         extraSuccessOnCritical: booleanField(false),
         healing: integerField(0),
         healingMod: integerField(0),
         img: stringField(''),
         isDamage: booleanField(false),
         isHealing: booleanField(false),
         itemDescription: stringField(''),
         itemName: stringField(''),
         opposedCheck: schemaField({
            attribute: stringField(''),
            enabled: booleanField(false),
            skill: stringField(''),
         }),
         resistanceCheck: stringField('none'),
         resolveCost: integerField(0),
         scaling: booleanField(false),
         skill: stringField(''),
         skillExpertise: integerField(0),
         skillTrainingDice: integerField(0),
         totalDice: integerField(0),
         totalExpertise: integerField(0),
         totalTrainingDice: integerField(0),
         trainingMod: integerField(0),
      }),
      results: schemaField({
         criticalFailures: integerField(0),
         criticalSuccesses: integerField(0),
         damage: integerField(0),
         dice: emptyObjectArray(),
         expertiseRemaining: integerField(0),
         extraSuccesses: integerField(0),
         healing: integerField(0),
         opposedCheckComplexity: integerField(0),
         succeeded: booleanField(false),
         successes: integerField(0),
      }),
   },
};

describe('check chat-message DataModel schema characterization (golden master)', () => {
   it.each([
      ['attribute'],
      ['resistance'],
      ['attack'],
      ['casting'],
      ['item'],
   ])('the %s check chat schema fingerprint matches the committed golden', (type) => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models[type]._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(GOLDENS[type]));
   });
});
