/**
 * Creates an Object Field that is set as required, and with an initial value.
 * Will be nullable if the initial value is null.
 * @param {object|null} [initial] - Initial value for the field.
 * @returns {ObjectField} The new Object Field.
 */
export default function createObjectField(initial = {}) {
   return new foundry.data.fields.ObjectField({
      required: true,
      initial: initial,
      nullable: initial === null,
   });
}
