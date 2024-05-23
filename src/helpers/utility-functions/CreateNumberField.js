/**
 * Creates a Number Field that is set as required, and with an initial value.
 * Will be nullable if the initial value is null.
 * @param {number} [initial] - Initial value for the field.
 * @returns {NumberField} The new Number Field.
 */
export default function createNumberField(initial = 0) {
   return new foundry.data.fields.NumberField({
      required: true,
      initial: initial,
      nullable: initial === null,
   });
}
