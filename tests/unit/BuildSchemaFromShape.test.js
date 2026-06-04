import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// buildSchemaFromShape composes the create*Field helpers, which call foundry.data.fields.*. The shared
// test setup only mocks foundry.abstract.Document + foundry.utils, so this suite installs stand-ins for
// the data-field classes (mirroring the approach in ItemChatMessageDataModel.test.js), then dynamically
// imports the helper so its imports resolve against those stand-ins. Dynamic import is permitted in
// tests (the no-dynamic-import rule governs the shipping bundle only).

/**
 * Minimal stand-in for a Foundry DataField that records the options it was constructed with, so a test
 * can assert on the declared initial value and nullability the create*Field helpers pass through.
 */
class MockField {
   /**
    * Stores the field options.
    * @param {object} options - The field configuration (e.g. initial, nullable).
    */
   constructor(options = {}) {
      /** @type {object} The field configuration. */
      this.options = options;
   }
}

/** Stand-in for StringField, distinct subclass so the produced field type can be asserted. */
class MockStringField extends MockField {}

/** Stand-in for NumberField, distinct subclass so the produced field type can be asserted. */
class MockNumberField extends MockField {}

/** Stand-in for BooleanField, distinct subclass so the produced field type can be asserted. */
class MockBooleanField extends MockField {}

/** Stand-in for ObjectField, distinct subclass so the produced field type can be asserted. */
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

/** @type {Function} Holds the dynamically imported buildSchemaFromShape helper. */
let buildSchemaFromShape;

beforeAll(async () => {
   // Install the data-field stand-ins before importing the helper (and the create*Field helpers it uses).
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

   buildSchemaFromShape = (await import('~/helpers/utility-functions/BuildSchemaFromShape.js')).default;
});

afterAll(() => {
   // Remove the data-field stand-ins so later suites keep the shared minimal mock.
   delete globalThis.foundry.data;
});

describe('buildSchemaFromShape — flat primitives', () => {
   it('maps string, number, and boolean values to their matching field types', () => {
      /** @type {object} The schema built from a flat primitive shape. */
      const schema = buildSchemaFromShape({
         name: 'Sword',
         value: 250,
         equipped: true,
      });

      expect(schema.name).toBeInstanceOf(MockStringField);
      expect(schema.value).toBeInstanceOf(MockNumberField);
      expect(schema.equipped).toBeInstanceOf(MockBooleanField);
   });

   it('seeds each primitive field with the representative value as its initial', () => {
      /** @type {object} The schema built from a flat primitive shape. */
      const schema = buildSchemaFromShape({
         name: 'Sword',
         value: 250,
         equipped: true,
      });

      // The create*Field helpers pass the representative value through as the field's initial.
      expect(schema.name.options.initial).toBe('Sword');
      expect(schema.value.options.initial).toBe(250);
      expect(schema.equipped.options.initial).toBe(true);
   });

   it('maps a whole-number value to an integer-enforced number field', () => {
      /** @type {object} The schema built from a shape whose number value is a whole number. */
      const schema = buildSchemaFromShape({
         value: 250,
      });

      // A whole-number value dispatches to createIntegerField, producing a NumberField with integer
      // enforcement (integer: true) seeded with the representative value.
      expect(schema.value).toBeInstanceOf(MockNumberField);
      expect(schema.value.options.integer).toBe(true);
      expect(schema.value.options.initial).toBe(250);
      expect(schema.value.options.nullable).toBe(false);
   });

   it('maps a fractional number value to a plain (non-integer) number field', () => {
      /** @type {object} The schema built from a shape whose number value is fractional. */
      const schema = buildSchemaFromShape({
         multiplier: 0.5,
      });

      // A fractional value dispatches to createNumberField, which does not set integer enforcement,
      // so decimals are permitted and the field's initial is the representative fractional value.
      expect(schema.multiplier).toBeInstanceOf(MockNumberField);
      expect(schema.multiplier.options.integer).toBeUndefined();
      expect(schema.multiplier.options.initial).toBe(0.5);
   });
});

describe('buildSchemaFromShape — nested objects', () => {
   it('maps a plain object to a SchemaField with correctly typed sub-fields', () => {
      /** @type {object} The schema built from a shape with a nested object. */
      const schema = buildSchemaFromShape({
         armor: {
            value: 1,
            name: 'Plate',
         },
      });

      expect(schema.armor).toBeInstanceOf(MockSchemaField);
      expect(schema.armor.fields.value).toBeInstanceOf(MockNumberField);
      expect(schema.armor.fields.name).toBeInstanceOf(MockStringField);
   });

   it('mirrors deeply nested objects so nested read paths are preserved', () => {
      /** @type {object} The schema built from a deeply nested shape. */
      const schema = buildSchemaFromShape({
         casting: {
            check: {
               difficulty: 4,
               attribute: 'mind',
            },
         },
      });

      // The schema must nest SchemaFields so system.casting.check.difficulty resolves.
      expect(schema.casting).toBeInstanceOf(MockSchemaField);
      expect(schema.casting.fields.check).toBeInstanceOf(MockSchemaField);
      expect(schema.casting.fields.check.fields.difficulty).toBeInstanceOf(MockNumberField);
      expect(schema.casting.fields.check.fields.attribute).toBeInstanceOf(MockStringField);
   });
});

describe('buildSchemaFromShape — arrays', () => {
   it('maps an array of primitives to an ArrayField with a primitive element field', () => {
      /** @type {object} The schema built from a shape with an array of strings. */
      const schema = buildSchemaFromShape({
         tags: [
            'sharp',
            'heavy',
         ],
      });

      expect(schema.tags).toBeInstanceOf(MockArrayField);
      expect(schema.tags.element).toBeInstanceOf(MockStringField);
   });

   it('maps an array of objects to an ArrayField whose element is a SchemaField of the element shape', () => {
      /** @type {object} The schema built from a shape with an array of objects. */
      const schema = buildSchemaFromShape({
         attack: [
            {
               label: 'Swing',
               damage: 3,
            },
         ],
      });

      expect(schema.attack).toBeInstanceOf(MockArrayField);
      expect(schema.attack.element).toBeInstanceOf(MockSchemaField);
      expect(schema.attack.element.fields.label).toBeInstanceOf(MockStringField);
      expect(schema.attack.element.fields.damage).toBeInstanceOf(MockNumberField);
   });

   it('falls back to an object element field for an empty array', () => {
      /** @type {object} The schema built from a shape with an empty array. */
      const schema = buildSchemaFromShape({
         check: [],
      });

      expect(schema.check).toBeInstanceOf(MockArrayField);
      expect(schema.check.element).toBeInstanceOf(MockObjectField);
   });
});

describe('buildSchemaFromShape — null and undefined', () => {
   it('maps null and undefined values to a nullable object field', () => {
      /** @type {object} The schema built from a shape with absent values. */
      const schema = buildSchemaFromShape({
         missing: null,
         absent: undefined,
      });

      // Absent values become a nullable object bag (initial null preserves the key without throwing).
      expect(schema.missing).toBeInstanceOf(MockObjectField);
      expect(schema.missing.options.initial).toBe(null);
      expect(schema.missing.options.nullable).toBe(true);
      expect(schema.absent).toBeInstanceOf(MockObjectField);
      expect(schema.absent.options.initial).toBe(null);
      expect(schema.absent.options.nullable).toBe(true);
   });
});

describe('buildSchemaFromShape — combined shape', () => {
   it('builds every field type from a mixed shape and preserves all keys', () => {
      /** @type {object} A mixed shape exercising every branch in one pass. */
      const schema = buildSchemaFromShape({
         name: 'Greatsword',
         value: 250,
         multiplier: 0.5,
         equipped: false,
         armor: {
            value: 2,
         },
         attack: [
            {
               label: 'Cleave',
            },
         ],
         trait: [
            'martial',
         ],
         check: [],
         note: null,
      });

      expect(Object.keys(schema)).toEqual([
         'name',
         'value',
         'multiplier',
         'equipped',
         'armor',
         'attack',
         'trait',
         'check',
         'note',
      ]);
      expect(schema.name).toBeInstanceOf(MockStringField);
      expect(schema.value).toBeInstanceOf(MockNumberField);
      // The whole-number value is integer-enforced, while the fractional value is a plain number field.
      expect(schema.value.options.integer).toBe(true);
      expect(schema.multiplier).toBeInstanceOf(MockNumberField);
      expect(schema.multiplier.options.integer).toBeUndefined();
      expect(schema.equipped).toBeInstanceOf(MockBooleanField);
      expect(schema.armor).toBeInstanceOf(MockSchemaField);
      expect(schema.attack).toBeInstanceOf(MockArrayField);
      expect(schema.attack.element).toBeInstanceOf(MockSchemaField);
      expect(schema.trait).toBeInstanceOf(MockArrayField);
      expect(schema.trait.element).toBeInstanceOf(MockStringField);
      expect(schema.check).toBeInstanceOf(MockArrayField);
      expect(schema.check.element).toBeInstanceOf(MockObjectField);
      expect(schema.note).toBeInstanceOf(MockObjectField);
   });
});
