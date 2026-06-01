import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for multiplying the base value of a Character's stat, rounding the result.
 * @typedef {object} MulBaseElement
 * @property {string} operation - The operation to be performed by the Rules Element (mulBase).
 * @property {string} selector - The type of stat being modified (attribute,
 * rating, training, expertise, resistance, or mod).
 * @property {string} key - The key of the stat being multiplied (body, willpower, etc.).
 * @property {number} value - The value by which to multiply the base (may be fractional).
 * @property {string} [rounding] - The rounding direction applied to the scaled base ('up' or 'down').
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * Creates a Rules Element for multiplying the base value of a Character's stat.
 * @param {object} [options] - Options for the rules element.
 * @returns {MulBaseElement} The new Rules Element.
 */
export default function createMulBaseElement(options) {
   return {
      operation: 'mulBase',
      selector: 'attribute',
      key: 'body',
      value: 2,
      rounding: 'down',
      uuid: options?.uuid ?? generateUUID(),
   };
}
