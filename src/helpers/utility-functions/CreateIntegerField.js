/**
 * Creates a Number Field that is set as an integer, required, and with an initial value.
 * Will be nullable if the initial value is null.
 * @param {number} [initial = 0] Initial value for the field.
 * @returns {NumberField}        The new Integer Number field.
 */
export default function createIntegerField(initial = 0) {
   return new foundry.data.fields.NumberField({
      required: true,
      initial: initial,
      integer: true,
      nullable: initial === null,
   });
}
