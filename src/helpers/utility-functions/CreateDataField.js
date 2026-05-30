/**
 * Creates an Data Field that is set as required, and with an initial value. Will be nullable if the initial value is
 * null.
 * @param {object|null} [initial] - Initial value for the field.
 * @returns {DataField} The new Data Field.
 */
export default function createDataField(initial = {}) {
   return new foundry.data.fields.DataField({
      required: true,
      initial: initial,
      nullable: initial === null,
   });
}
