import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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

/**
 * Minimal stand-in for a Foundry DataField that records the options it was constructed with, so the
 * fingerprint can read the declared required/nullable/initial/integer the create*Field helpers pass.
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

/** @type {object} Holds the dynamically imported check chat-message DataModel classes keyed by type. */
const models = {};

/**
 * Maps a mock field instance to the stable kind string recorded in a fingerprint.
 * @param {MockField} field - The mock field to classify.
 * @returns {string} The stable kind string (e.g. 'StringField', 'ArrayField').
 */
function kindOf(field) {
   // The mock class names map one-to-one onto the Foundry field kinds; strip the 'Mock' prefix.
   return field.constructor.name.replace(/^Mock/, '');
}

/**
 * Deep-serializes a resolved initial value into a plain, JSON-comparable form. A function initial is
 * called first, then its result is serialized; everything else is structurally cloned.
 * @param {*} initial - The resolved initial value (possibly a factory function, object, array, or scalar).
 * @returns {*} A plain, deterministic, deep-comparable copy of the initial.
 */
function serializeInitial(initial) {
   // Resolve a factory-function initial to its produced value before serializing.
   const resolved = typeof initial === 'function' ? initial() : initial;

   // Undefined survives structuredClone but not JSON; normalize it explicitly.
   if (resolved === undefined) {
      return undefined;
   }
   return structuredClone(resolved);
}

/**
 * Recursively serializes a mock field into a plain, deterministic, comparable object so two schema
 * builds can be deep-equality compared. Records kind, required, nullable, and (only when present)
 * integer for every field. ArrayField additionally records its resolved array initial and recurses
 * into its element WITHOUT the element's own initial (an array element's initial is inert — Foundry
 * populates the array from the array's own initial, never the element's — so comparing it would create
 * false divergences). SchemaField recurses into each sub-field with the full fingerprint. Scalar
 * leaves and non-array-element object fields record their resolved initial.
 * @param {MockField} field - The mock field to fingerprint.
 * @param {boolean} [omitInitial] - When true, omit this field's own initial (used for array elements).
 * @returns {object} A stable, key-sorted fingerprint of the field.
 */
function fingerprint(field, omitInitial = false) {
   /** @type {object} The accumulated fingerprint for this field. */
   const record = {
      kind: kindOf(field),
      required: field.options.required ?? false,
      nullable: field.options.nullable ?? false,
   };

   // Record integer enforcement only when the field declares it (number fields only).
   if (field.options.integer !== undefined) {
      record.integer = field.options.integer;
   }

   // ArrayField: record its resolved array initial (deep) and recurse into its element without initial.
   if (field instanceof MockArrayField) {
      if (!omitInitial) {
         record.initial = serializeInitial(field.options.initial);
      }
      record.element = fingerprint(field.element, true);
      return sortObjectKeys(record);
   }

   // SchemaField: recurse into each sub-field with the full fingerprint (including initial).
   if (field instanceof MockSchemaField) {
      /** @type {object} The fingerprints of each sub-field keyed by sub-field name. */
      const fields = {};
      for (const [name, subField] of Object.entries(field.fields)) {
         fields[name] = fingerprint(subField);
      }
      record.fields = sortObjectKeys(fields);
      return sortObjectKeys(record);
   }

   // Scalar leaves and non-array-element object fields: record the resolved initial.
   if (!omitInitial) {
      record.initial = serializeInitial(field.options.initial);
   }
   return sortObjectKeys(record);
}

/**
 * Returns a shallow copy of an object with its keys sorted, so deep-equality comparison is order
 * independent. Nested values are assumed already sorted by the recursive fingerprint walk.
 * @param {object} object - The object whose keys to sort.
 * @returns {object} A new object with the same entries in sorted-key order.
 */
function sortObjectKeys(object) {
   /** @type {object} The key-sorted copy. */
   const sorted = {};
   for (const key of Object.keys(object).sort()) {
      sorted[key] = object[key];
   }
   return sorted;
}

/**
 * Fingerprints an entire schema field map (the object returned by _defineDocumentSchema()).
 * @param {object} schema - The map of field name to mock field.
 * @returns {object} A stable, key-sorted fingerprint of every field in the schema.
 */
function fingerprintSchema(schema) {
   /** @type {object} The fingerprints of each top-level field keyed by field name. */
   const result = {};
   for (const [name, field] of Object.entries(schema)) {
      result[name] = fingerprint(field);
   }
   return sortObjectKeys(result);
}

beforeAll(async () => {
   // The shared shape templates and create*Field helpers call localize() (game.i18n) when a schema is
   // built. Provide a pass-through i18n stand-in for the duration of this suite.
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

   // Some transitively imported modules destructure foundry.applications.api.ApplicationV2 at import
   // time; provide a stand-in so those imports resolve.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };

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
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.foundry.applications;
   delete globalThis.game;
});

/**
 * Builds a fingerprint of a leaf ObjectField array element (the empty-array fallback element shared by
 * every object-valued array in a check parameter/result shape). Array elements omit their own initial.
 * @returns {object} The fingerprint of an ObjectField array element.
 */
function objectElement() {
   return {
      kind: 'ObjectField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of an empty-initial array field whose element is an ObjectField — the
 * shape produced by buildSchemaFromShape for an empty object-array template value (dice, scalingAspect).
 * @returns {object} The fingerprint of an empty ObjectField array field.
 */
function emptyObjectArray() {
   return {
      element: objectElement(),
      initial: [],
      kind: 'ArrayField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a non-integer NumberField with a numeric initial — the shape of
 * documentVersion produced by createNumberField (no integer enforcement).
 * @param {number} initial - The numeric initial value.
 * @returns {object} The fingerprint of a non-integer NumberField.
 */
function numberField(initial) {
   return {
      initial,
      kind: 'NumberField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of an integer-enforced NumberField — the shape produced by
 * createIntegerField (integer: true). buildSchemaFromShape maps EVERY numeric template value to one.
 * @param {number} initial - The numeric initial value.
 * @returns {object} The fingerprint of an integer NumberField.
 */
function integerField(initial) {
   return {
      initial,
      integer: true,
      kind: 'NumberField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a required, non-nullable StringField.
 * @param {string} initial - The string initial value.
 * @returns {object} The fingerprint of a StringField.
 */
function stringField(initial) {
   return {
      initial,
      kind: 'StringField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a required, non-nullable BooleanField.
 * @param {boolean} initial - The boolean initial value.
 * @returns {object} The fingerprint of a BooleanField.
 */
function booleanField(initial) {
   return {
      initial,
      kind: 'BooleanField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a SchemaField (the shape produced by createSchemaField, which passes
 * no options, so required and nullable both default to false).
 * @param {object} fields - The fingerprints of each sub-field keyed by sub-field name.
 * @returns {object} The fingerprint of a SchemaField.
 */
function schemaField(fields) {
   return {
      fields,
      kind: 'SchemaField',
      nullable: false,
      required: false,
   };
}

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
         resistanceCheck: stringField(''),
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

/**
 * Recursively key-sorts a golden fingerprint so it compares equal to the key-sorted output of
 * fingerprintSchema, regardless of the order the golden literal was authored in.
 * @param {*} value - The golden value (object, array, or scalar) to sort.
 * @returns {*} The deeply key-sorted copy.
 */
function sortFingerprint(value) {
   // Arrays keep their order; recurse into entries (array element initials are order-significant).
   if (Array.isArray(value)) {
      return value.map((entry) => sortFingerprint(entry));
   }

   // Plain objects are key-sorted with their values recursively sorted.
   if (value && typeof value === 'object') {
      /** @type {object} The key-sorted copy. */
      const sorted = {};
      for (const key of Object.keys(value).sort()) {
         sorted[key] = sortFingerprint(value[key]);
      }
      return sorted;
   }

   // Scalars pass through unchanged.
   return value;
}
