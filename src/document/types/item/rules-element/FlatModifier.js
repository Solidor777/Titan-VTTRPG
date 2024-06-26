import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for add a simple bonus or penalty to the value of a Character's stat.
 * @typedef {object} FlatModifierElement
 * @property {string}   operation   The operation to be performed by the Rules Element (flatModfier).
 * @property {string}   selector    The type of stat being modified (attribute, rating, training, expertise, resistance, or mod).
 * @property {string}   key         The Key of the stat being multiplied (body, willpower, etc.).
 * @property {integer}   value       The value by which to modify the stat.
 * @property {string}   uuid        Unique identifier for the Rules Element.
 *                                  Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for add a simple bonus or penalty to the value of a Character's stat.
 * @param {string?}  uuid  Unique identifier for the Rules Element. Used when changing Rules Element types.
 *                         If none is provided, one will be generated.
 * @returns {FlatModifierElement}   The new Rules Element.
 */
export default function createFlatModifierElement(uuid) {
   return {
      operation: 'flatModifier',
      selector: 'attribute',
      key: 'body',
      value: 1,
      uuid: uuid ?? generateUUID(),
   };
}
