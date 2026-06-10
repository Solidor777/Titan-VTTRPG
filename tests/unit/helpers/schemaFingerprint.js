// Shared schema-fingerprint harness for the golden-master (characterization) suites:
// CheckChatMessageSchemaEquivalence, ItemDataModelSchemaEquivalence,
// ReportChatMessageSchemaEquivalence, and EffectSchemaEquivalence. The golden masters themselves
// stay inline per suite (hand-authored literals, per the characterization-test rule) — only the
// field stand-ins, the fingerprint machinery, the Foundry stand-in install/restore pair, and the
// common golden-builder helpers live here. Suite-specific extras (e.g. the Effect suite's
// MockDataField/dataField, the Item suite's settings sentinels) stay local to their suite.

/**
 * Minimal stand-in for a Foundry DataField that records the options it was constructed with, so the
 * fingerprint can read the declared required/nullable/initial/integer the create*Field helpers pass.
 */
export class MockField {
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
export class MockStringField extends MockField {}

/** Stand-in for NumberField, a distinct subclass so the produced field type can be asserted. */
export class MockNumberField extends MockField {}

/** Stand-in for BooleanField, a distinct subclass so the produced field type can be asserted. */
export class MockBooleanField extends MockField {}

/** Stand-in for ObjectField, a distinct subclass so the produced field type can be asserted. */
export class MockObjectField extends MockField {}

/** Stand-in for ArrayField that captures its element field as the first constructor argument. */
export class MockArrayField extends MockField {
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
export class MockSchemaField extends MockField {
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
export class MockTypeDataModel {}

/**
 * Maps a mock field instance to the stable kind string recorded in a fingerprint.
 * @param {MockField} field - The mock field to classify.
 * @returns {string} The stable kind string (e.g. 'StringField', 'ArrayField').
 */
export function kindOf(field) {
   // The mock class names map one-to-one onto the Foundry field kinds; strip the 'Mock' prefix.
   return field.constructor.name.replace(/^Mock/, '');
}

/**
 * Deep-serializes a resolved initial value into a plain, JSON-comparable form. A function initial is
 * called first, then its result is serialized; everything else is structurally cloned.
 * @param {*} initial - The resolved initial value (possibly a factory function, object, array, or scalar).
 * @returns {*} A plain, deterministic, deep-comparable copy of the initial.
 */
export function serializeInitial(initial) {
   // Resolve a factory-function initial to its produced value before serializing.
   const resolved = typeof initial === 'function' ? initial() : initial;

   // Undefined survives structuredClone but not JSON; normalize it explicitly.
   if (resolved === undefined) {
      return undefined;
   }
   return structuredClone(resolved);
}

/**
 * Returns a shallow copy of an object with its keys sorted, so deep-equality comparison is order
 * independent. Nested values are assumed already sorted by the recursive fingerprint walk.
 * @param {object} object - The object whose keys to sort.
 * @returns {object} A new object with the same entries in sorted-key order.
 */
export function sortObjectKeys(object) {
   /** @type {object} The key-sorted copy. */
   const sorted = {};
   for (const key of Object.keys(object).sort()) {
      sorted[key] = object[key];
   }
   return sorted;
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
export function fingerprint(field, omitInitial = false) {
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
 * Fingerprints an entire schema field map (the object returned by _defineDocumentSchema()).
 * @param {object} schema - The map of field name to mock field.
 * @returns {object} A stable, key-sorted fingerprint of every field in the schema.
 */
export function fingerprintSchema(schema) {
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
export function sortFingerprint(value) {
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

/**
 * Installs the Foundry stand-ins (i18n, TypeDataModel, the data-field classes, ApplicationV2) the
 * schema suites need before dynamically importing real data models. Call from a suite's beforeAll;
 * suite-specific extras (settings sentinels, extra field stand-ins, extra globals) are added by the
 * suite after this call.
 * @returns {void}
 */
export function installSchemaMocks() {
   // The shared shape templates and create*Field helpers call localize() (game.i18n) when a schema
   // is built. Provide a pass-through i18n stand-in for the duration of the suite.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
   };

   // Install the TypeDataModel and data-field stand-ins before the suite imports the data models.
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
}

/**
 * Removes the stand-ins installed by installSchemaMocks so later suites keep the shared minimal
 * mock (tests/setup.js defines neither foundry.data nor foundry.applications, so deleting them
 * restores the baseline). Call from a suite's afterAll; suite-specific extras are removed by the
 * suite alongside this call.
 * @returns {void}
 */
export function restoreSchemaMocks() {
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.foundry.applications;
   delete globalThis.game;
}

/**
 * Builds a fingerprint of a leaf ObjectField array element (the empty-array fallback element shared
 * by the object-valued arrays in the document shapes). Array elements omit their own initial.
 * @returns {object} The fingerprint of an ObjectField array element.
 */
export function objectElement() {
   return {
      kind: 'ObjectField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of an empty-initial array field whose element is an ObjectField —
 * the shape produced for an empty object-array template value.
 * @returns {object} The fingerprint of an empty ObjectField array field.
 */
export function emptyObjectArray() {
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
export function numberField(initial) {
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
export function integerField(initial) {
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
export function stringField(initial) {
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
export function booleanField(initial) {
   return {
      initial,
      kind: 'BooleanField',
      nullable: false,
      required: true,
   };
}

/**
 * Builds the golden fingerprint of a SchemaField (the shape produced by createSchemaField, which
 * passes no options, so required and nullable both default to false).
 * @param {object} fields - The fingerprints of each sub-field keyed by sub-field name.
 * @returns {object} The fingerprint of a SchemaField.
 */
export function schemaField(fields) {
   return {
      fields,
      kind: 'SchemaField',
      nullable: false,
      required: false,
   };
}
