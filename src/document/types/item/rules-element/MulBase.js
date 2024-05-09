import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for multiplying the base value of a Character's stat.
 * @typedef {object} MulBaseElement
 * @property {string}   operation   The operation to be performed by the Rules Element (mulBase).
 * @property {string}   selector    The type of stat being modified (attribute, rating, training, expertise, resistance, or mod).
 * @property {string}   key         The key of the stat being multiplied (body, willpower, etc.).
 * @property {number}   value       The value by which to multiply the stat.
 * @property {string}   uuid        Unique identifier for the Rules Element.
 *                                  Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for multiplying the base value of a Character's stat.
 * @param {string?}  uuid  Unique identifier for the Rules Element. Used when changing Rules Element types.
 *                         If none is provided, one will be generated.
 * @returns {MulBaseElement}  The new Rules Element.
 */
export default function createMulBaseElement(uuid) {
   return {
      operation: 'mulBase',
      selector: 'attribute',
      key: 'body',
      value: 2,
      uuid: uuid ?? generateUUID(),
   };
}
