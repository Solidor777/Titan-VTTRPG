import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for multiplying the running total (base value plus all accumulated modifiers) of a
 * Character's stat, then rounding the result.
 * @typedef {object} MulSumElement
 * @property {string} operation - The operation to be performed by the Rules Element (mulSum).
 * @property {string} selector - The type of stat being modified (attribute, rating, resistance,
 * resource, speed, training, expertise, or mod).
 * @property {string} key - The key of the stat being modified (body, stride, etc.), or 'all' for every
 * key under the selector.
 * @property {number} value - The fractional multiplier applied to the running total (0.5 to halve).
 * @property {string} rounding - The rounding direction applied to the scaled total ('up' or 'down').
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * Creates a Rules Element for multiplying the running total of a Character's stat.
 * @param {object} [options] - Options for the rules element.
 * @returns {MulSumElement} The new Rules Element.
 */
export default function createMulSumElement(options) {
   return {
      operation: 'mulSum',
      selector: 'speed',
      key: 'stride',
      value: 0.5,
      rounding: 'up',
      uuid: options?.uuid ?? generateUUID(),
   };
}
