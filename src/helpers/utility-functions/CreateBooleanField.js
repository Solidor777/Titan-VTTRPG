/**
 * Creates a Boolean Field that is set as required, and with an initial value.
 * Will be nullable if the initial value is null.
 * @param {boolean} [initial] - Initial value for the field.
 * @returns {BooleanField} The new Boolean Field.
 */
export default function createBooleanField(initial = false) {
   return new foundry.data.fields.BooleanField({
      required: true,
      initial: initial,
      nullable: initial === null,
   });
}
