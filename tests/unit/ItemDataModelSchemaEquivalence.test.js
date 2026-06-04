import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Characterization (golden-master) gate for the seven item-type DataModel schemas. Follow-up B will
// rebuild each static _defineDocumentSchema() from shared shape templates via buildSchemaFromShape();
// this suite freezes a byte-exact fingerprint of the CURRENT schemas so that refactor can be proven to
// leave the persisted data shape unchanged. The item DataModels chain through TitanItemDataModel ->
// TitanDataModel -> foundry.abstract.TypeDataModel and define their schema via the create*Field helpers,
// which call foundry.data.fields.*; some type modules also import dialog classes that destructure
// foundry.applications.api.ApplicationV2 at import time, and Spell/Ability read default XP costs from
// game.settings. This suite installs stand-ins for all of those before dynamically importing the real
// data models, then fingerprints each schema and asserts it deep-equals a committed golden written
// inline below. Dynamic import is permitted in tests (the no-dynamic-import rule governs the shipping
// bundle only).

// The weapon attack template seeds a random uuid via generateUUID(); mock that module to a fixed
// sentinel so the weapon attack array initial is deterministic and the golden can be a literal. The
// mock is hoisted above the dynamic imports in beforeAll, so it applies to the whole module graph.
vi.mock('~/helpers/utility-functions/GenerateUUID.js', () => {
   return {
      default: () => 'UUID',
   };
});

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

/**
 * Distinct sentinel XP costs per setting key, so the golden also proves which setting feeds each
 * type's xpCost (spell -> 777, ability -> 999). The sentinels are deliberately implausible (not the
 * real world defaults) so a regression that hardcoded a literal xpCost instead of reading the setting
 * would fail the gate.
 * @type {object}
 */
const SENTINELS = {
   'defaultXpCost.spell': 777,
   'defaultXpCost.ability': 999,
};

/** @type {object} Holds the dynamically imported item-type DataModel classes keyed by item type. */
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
   // built; Spell/Ability read default XP costs from game.settings. Provide pass-through i18n and a
   // settings.get that returns the distinct per-key sentinel.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
      settings: {
         get: (namespace, key) => SENTINELS[key],
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

   // Some type modules import dialog classes that destructure foundry.applications.api.ApplicationV2 at
   // import time; TitanItem (pulled in transitively) extends the global Item document class.
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };
   globalThis.Item = class {};

   // Dynamically import every item-type DataModel against the installed stand-ins.
   models.weapon = (await import('~/document/types/item/types/weapon/WeaponDataModel.js')).default;
   models.armor = (await import('~/document/types/item/types/armor/ArmorDataModel.js')).default;
   models.spell = (await import('~/document/types/item/types/spell/SpellDataModel.js')).default;
   models.ability = (await import('~/document/types/item/types/ability/AbilityDataModel.js')).default;
   models.shield = (await import('~/document/types/item/types/shield/ShieldDataModel.js')).default;
   models.equipment = (await import('~/document/types/item/types/equipment/EquipmentDataModel.js')).default;
   models.commodity = (await import('~/document/types/item/types/commodity/CommodityDataModel.js')).default;
});

afterAll(() => {
   // Remove the stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.foundry.applications;
   delete globalThis.Item;
   delete globalThis.game;
});

/**
 * Builds a fingerprint of a leaf ObjectField array element (the empty-array fallback element shared by
 * check/customTrait/trait/aspect/rulesElement/customAspect). Array elements omit their own initial.
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
 * shared shape of check, customTrait, trait, aspect, rulesElement, and customAspect.
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
 * The shared base fingerprints every item DataModel inherits from TitanDataModel + TitanItemDataModel:
 * documentVersion (non-integer NumberField), description, and the two object-array snapshots.
 * @returns {object} The fingerprints of the shared base fields keyed by field name.
 */
function baseFields() {
   return {
      check: emptyObjectArray(),
      customTrait: emptyObjectArray(),
      description: stringField(''),
      documentVersion: numberField(0),
   };
}

/**
 * The committed golden fingerprints for each item-type DataModel schema, frozen from the CURRENT code.
 * Any divergence after follow-up B's refactor signals a change to the persisted item data shape.
 * @type {object}
 */
const GOLDENS = {
   // Weapon: rules-element type with an attack array seeded with one default attack object.
   weapon: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      equipped: booleanField(false),
      attack: {
         element: objectElement(),
         initial: [
            {
               attribute: 'body',
               customTrait: [],
               damage: 1,
               label: 'LOCAL.attack.text',
               plusExtraSuccessDamage: true,
               range: 1,
               skill: 'meleeWeapons',
               trait: [],
               type: 'melee',
               uuid: 'UUID',
            },
         ],
         kind: 'ArrayField',
         nullable: false,
         required: true,
      },
      attackNotes: stringField(''),
      trait: emptyObjectArray(),
   },

   // Armor: rules-element type with a nested armor SchemaField (max/value integers, both initial 1).
   armor: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      armor: {
         fields: {
            max: integerField(1),
            value: integerField(1),
         },
         kind: 'SchemaField',
         nullable: false,
         required: false,
      },
      trait: emptyObjectArray(),
   },

   // Spell: NOT a rules-element type (no rulesElement field); xpCost seeded from the spell setting (777).
   spell: {
      ...baseFields(),
      rarity: stringField('common'),
      xpCost: integerField(777),
      tradition: stringField(''),
      castingCheck: {
         fields: {
            attribute: stringField('mind'),
            autoCalculateDC: booleanField(true),
            complexity: integerField(1),
            difficulty: integerField(4),
            skill: stringField('arcana'),
         },
         kind: 'SchemaField',
         nullable: false,
         required: false,
      },
      quantity: integerField(1),
      aspect: emptyObjectArray(),
      customAspect: emptyObjectArray(),
   },

   // Ability: rules-element type; xpCost seeded from the ability setting (999), three boolean toggles.
   ability: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      xpCost: integerField(999),
      rarity: stringField('common'),
      action: booleanField(false),
      reaction: booleanField(false),
      passive: booleanField(false),
   },

   // Shield: rules-element type with a flat integer defense field.
   shield: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      defense: integerField(0),
      trait: emptyObjectArray(),
   },

   // Equipment: rules-element type with the simple rarity/value/equipped trio.
   equipment: {
      ...baseFields(),
      rulesElement: emptyObjectArray(),
      rarity: stringField('common'),
      value: integerField(0),
      equipped: booleanField(false),
   },

   // Commodity: NOT a rules-element type (no rulesElement field); rarity/value/quantity.
   commodity: {
      ...baseFields(),
      rarity: stringField('common'),
      value: integerField(0),
      quantity: integerField(1),
   },
};

describe('item DataModel schema characterization (golden master)', () => {
   it.each([
      ['weapon'],
      ['armor'],
      ['spell'],
      ['ability'],
      ['shield'],
      ['equipment'],
      ['commodity'],
   ])('the %s schema fingerprint matches the committed golden', (type) => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models[type]._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(GOLDENS[type]));
   });

   it('spell and commodity carry no rulesElement field; the other five do', () => {
      // The five rules-element item types expose a rulesElement array; spell and commodity do not.
      for (const type of ['weapon', 'armor', 'ability', 'shield', 'equipment']) {
         expect(models[type]._defineDocumentSchema().rulesElement).toBeInstanceOf(MockArrayField);
      }
      for (const type of ['spell', 'commodity']) {
         expect(models[type]._defineDocumentSchema().rulesElement).toBeUndefined();
      }
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


