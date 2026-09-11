/**
 * Maps a leaf DataField instance to the primitive coercion type DecodeCell understands.
 * @param {foundry.data.fields.DataField} field - The leaf field.
 * @returns {'string'|'number'|'boolean'|undefined} The primitive type, or undefined for an
 *    ObjectField/unrecognized field, which decodes with untyped-bag literal rules instead.
 */
function primitiveTypeOf(field) {
   const { fields } = foundry.data;
   if (field instanceof fields.NumberField) {
      return 'number';
   }
   if (field instanceof fields.BooleanField) {
      return 'boolean';
   }
   if (field instanceof fields.StringField) {
      return 'string';
   }
   return undefined;
}

/**
 * Walks a Foundry SchemaField (or any DataField) into a flat map of dotted path to primitive type
 * info, used to drive schema-aware cell decoding. An ArrayField's element is walked under a `.*`
 * wildcard segment (see `normalizePath`); an ObjectField (or any field with no recognized primitive
 * type) contributes no entry, so its path — and everything under it — decodes with the untyped-bag
 * literal rules in DecodeCell instead.
 * @param {foundry.data.fields.DataField} field - The field to walk.
 * @param {string} prefix - The dotted path prefix accumulated so far.
 * @param {Object<string, {type: string, nullable: boolean}>} [into] - The map being built (mutated and
 *    returned).
 * @returns {Object<string, {type: string, nullable: boolean}>} The flat path -> type-info map.
 */
export function resolveFieldSchema(field, prefix, into = {}) {
   const { fields } = foundry.data;
   if (field instanceof fields.SchemaField) {
      for (const [key, sub] of Object.entries(field.fields)) {
         resolveFieldSchema(sub, `${prefix}.${key}`, into);
      }
      return into;
   }
   if (field instanceof fields.ArrayField) {
      resolveFieldSchema(field.element, `${prefix}.*`, into);
      return into;
   }
   /** @type {'string'|'number'|'boolean'|undefined} */
   const primitiveType = primitiveTypeOf(field);
   if (primitiveType !== undefined) {
      into[prefix] = { type: primitiveType, nullable: field.nullable === true };
   }
   return into;
}

/**
 * Builds the per-document-subtype field-schema info (used for column ordering and typed cell decoding)
 * for every subtype registered under a pack's document type, including the Document class's own
 * `prototypeToken` sub-schema for Actor packs (the TypeDataModel's schema alone only covers `system.*`).
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type.
 * @returns {Object<string, {fieldTypes: Object<string,{type:string,nullable:boolean}>, fieldOrder: string[]}>}
 *    Map of document subtype name to its resolved schema info. `fieldOrder` mirrors `fieldTypes`'
 *    declaration order (JS preserves string-key insertion order), used to sort spreadsheet columns.
 */
export function resolveTypeSchemas(packType) {
   /** @type {Object<string, typeof foundry.abstract.TypeDataModel>} */
   const dataModels = CONFIG[packType].dataModels;
   /** @type {object} The Document class's own schema (adds prototypeToken for Actor packs). */
   const documentSchema = CONFIG[packType].documentClass.schema;

   /** @type {Object<string, {fieldTypes: object, fieldOrder: string[]}>} */
   const result = {};
   for (const [subtype, DataModelClass] of Object.entries(dataModels)) {
      /** @type {Object<string, {type:string,nullable:boolean}>} */
      const fieldTypes = {};
      resolveFieldSchema(DataModelClass.schema, 'system', fieldTypes);
      if (packType === 'Actor' && documentSchema.fields.prototypeToken) {
         resolveFieldSchema(documentSchema.fields.prototypeToken, 'prototypeToken', fieldTypes);
      }
      result[subtype] = { fieldTypes, fieldOrder: Object.keys(fieldTypes) };
   }
   return result;
}
