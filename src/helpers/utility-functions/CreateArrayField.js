/**
 * Creates an Array Field that is set as required, and with an initial value.
 * Will be nullable if the initial value is null.
 * @param {DataField} subField - The Field to be contained within the Array Field.
 * @param {[]|null} [initial] - Initial value for the field.
 * @returns {ArrayField} The new Array Field.
 */
export default function createArrayField(subField, initial = []) {
   return new foundry.data.fields.ArrayField(
      subField,
      {
         required: true,
         initial: initial,
         nullable: initial === null,
      },
   );
}
