/**
 * Creates a String Field that is set as required, and with an initial value.
 * Will be nullable if the initial value is null.
 * @param {string|null} [initial = '']  Initial value for the field.
 * @returns {StringField}               The new String Field.
 */
export default function createStringField(initial = '') {
   return new foundry.data.fields.StringField({
      required: true,
      initial: initial,
      nullable: initial === null,
   });
}
