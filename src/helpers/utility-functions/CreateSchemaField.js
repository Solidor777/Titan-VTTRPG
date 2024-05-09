/**
 * Creates a Schema Field containing the inputted Fields.
 * @param {object} [schema = {} ]   Object containing the Fields to wrap in the Schema field.
 * @returns {SchemaField}           The new Schema Field.
 */
export default function createSchemaField(schema = {}) {
   return new foundry.data.fields.SchemaField(schema);
}
