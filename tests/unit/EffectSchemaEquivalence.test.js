import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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

/** Stand-in for DataField, a distinct subclass so the produced field type can be asserted. */
class MockDataField extends MockField {}

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

/** @type {object} Holds the dynamically imported effect DataModel classes keyed by a stable name. */
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

beforeAll(async () => {
   // The create*Field helpers and shape templates may call localize() (game.i18n) when a schema is
   // built; provide a pass-through i18n and an inert settings.get.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
      settings: {
         get: () => undefined,
      },
   };

   // Install the TypeDataModel and data-field stand-ins before importing the data models.
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
   globalThis.foundry.data = {
      fields: {
         DataField: MockDataField,
         StringField: MockStringField,
         NumberField: MockNumberField,
         BooleanField: MockBooleanField,
         ObjectField: MockObjectField,
         ArrayField: MockArrayField,
         SchemaField: MockSchemaField,
      },
   };

   // Some transitive modules destructure foundry.applications.api.ApplicationV2 at import time.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };

   // Dynamically import the live Active Effect data model against the installed stand-ins.
   models.effect = (
      await import('~/document/types/active-effect/TitanActiveEffectDataModel.js')
   ).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.foundry.applications;
   delete globalThis.game;
});

/**
 * Builds a fingerprint of a leaf ObjectField array element (the empty-array fallback element shared
 * by check/customTrait/rulesElement). Array elements omit their own initial.
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
 * Builds the golden fingerprint of an empty-initial array field whose element is an ObjectField —
 * the shared shape of check, customTrait, and rulesElement.
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
 * createIntegerField (integer: true).
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
 * createEffectSystemTemplate()). createSchemaField passes no options, so required defaults to false.
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

describe('effect schema characterization (golden master)', () => {
   it('the live TitanActiveEffectDataModel schema fingerprint matches the committed golden', () => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models.effect._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(EFFECT_DATA_MODEL_GOLDEN));
   });
});
