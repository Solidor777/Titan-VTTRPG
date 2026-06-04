import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createNumberField from '~/helpers/utility-functions/CreateNumberField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Builds a single Foundry data field that describes one value of a shape template, dispatching on the
 * runtime type of the value. This is the per-value core of the recursive shape-to-schema conversion.
 *
 * Mapping (by value type):
 * - `string` -> `createStringField(value)` (the representative value seeds the field's initial).
 * - `number` -> `createIntegerField(value)` when the representative value is a whole number
 *   (`Number.isInteger(value)`), otherwise `createNumberField(value)`. Whole-number template values
 *   therefore produce an integer-enforced field (matching the hand-written item schemas, which use
 *   `createIntegerField` for all numeric fields), while fractional values produce a plain number field.
 * - `boolean` -> `createBooleanField(value)`.
 * - `Array` -> `createArrayField(<element field>)`, where the element field is derived by recursing on
 *   the first element (`value[0]`). An EMPTY array has no representative element, so it falls back to an
 *   `createObjectField()` element field; shape templates SHOULD provide at least one representative
 *   element so arrays of primitives or objects produce a faithful element schema.
 * - plain `object` -> a `SchemaField` (via `createSchemaField`) whose sub-fields are the result of
 *   recursing into the object with `buildSchemaFromShape`, so nested read paths are mirrored exactly.
 * - `null` / `undefined` -> a nullable `createObjectField(null)`; a shape cannot express a typed field
 *   for an absent value, so it is represented as a nullable object bag (the least-surprising default
 *   that preserves the key and tolerates any later value without throwing).
 * @param {*} value - A representative value from a shape template whose field is being derived.
 * @returns {DataField} The Foundry data field describing the value.
 */
function buildFieldFromValue(value) {
   // Absent values cannot be typed from the shape, so represent them as a nullable object bag.
   if (value === null || value === undefined) {
      return createObjectField(null);
   }

   // Arrays map to an ArrayField whose element schema is derived from a representative element.
   if (Array.isArray(value)) {
      // The representative element (the first entry), or undefined when the array is empty.
      const representativeElement = value[0];

      // The element field: derived from the representative element, or an object field when empty.
      const elementField = value.length > 0 ? buildFieldFromValue(representativeElement) : createObjectField();

      return createArrayField(elementField);
   }

   // Plain objects map to a SchemaField whose sub-fields are recursively built from the object.
   if (typeof value === 'object') {
      return createSchemaField(buildSchemaFromShape(value));
   }

   // Primitive values map to their corresponding typed field, seeded with the representative value.
   switch (typeof value) {
      case 'string': {
         return createStringField(value);
      }
      case 'number': {
         // Whole-number template values map to an integer-enforced field (mirroring the hand-written
         // item schemas); fractional values keep the plain number field that permits decimals.
         return Number.isInteger(value) ? createIntegerField(value) : createNumberField(value);
      }
      case 'boolean': {
         return createBooleanField(value);
      }
      default: {
         // Any other primitive (e.g. bigint, symbol, function) is not expressible from a shape, so it
         // falls back to a nullable object bag rather than silently dropping the key.
         return createObjectField(null);
      }
   }
}

/**
 * Recursively converts a plain JavaScript "shape template" object into a Foundry v14 DataModel schema
 * (a map of schema-field instances keyed by property name), so a data model can be defined from a
 * canonical shape rather than hand-written field by field.
 *
 * Each own enumerable property of `shape` is mapped to a field by the runtime type of its value:
 * `string`/`number`/`boolean` become the matching typed field (seeded with the representative value),
 * where a `number` becomes an integer-enforced field when its value is whole (`Number.isInteger`) and a
 * plain number field otherwise, arrays become an `ArrayField` whose element schema is derived from a
 * representative element (empty
 * arrays fall back to an object element field), and plain objects become a `SchemaField` built by
 * recursing into the object. `null` / `undefined` values become a nullable object field. The result
 * deeply mirrors the shape's nesting so the resulting schema's READ PATHS match the shape's paths
 * (e.g. shape `{ armor: { value: 1 } }` yields a schema where `system.armor.value` resolves). This is
 * a pure function with no side effects.
 * @param {object} shape - The plain-object shape template to convert into a schema field map.
 * @returns {object} A field map (property name -> DataField instance) suitable as a `defineSchema` /
 *    `_defineDocumentSchema` return value.
 */
export default function buildSchemaFromShape(shape) {
   // The schema field map being assembled from the shape's properties.
   const schema = {};

   for (const [key, value] of Object.entries(shape)) {
      schema[key] = buildFieldFromValue(value);
   }

   return schema;
}
