import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for forcing the running total (base value plus all accumulated modifiers) of a
 * Character's stat to a target value.
 * @typedef {object} SetSumElement
 * @property {string} operation - The operation to be performed by the Rules Element (setSum).
 * @property {string} selector - The type of stat being modified (attribute, rating, resistance,
 * resource, speed, training, expertise, or mod).
 * @property {string} key - The key of the stat being modified (body, stride, etc.), or 'all' for every
 * key under the selector.
 * @property {number} value - The target total value.
 * @property {string} mode - 'set' (force exact), 'min' (floor), or 'max' (cap).
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * Creates a Rules Element for forcing the running total of a Character's stat to a value.
 * @param {object} [options] - Options for the rules element.
 * @returns {SetSumElement} The new Rules Element.
 */
export default function createSetSumElement(options) {
   return {
      operation: 'setSum',
      selector: 'speed',
      key: 'stride',
      value: 0,
      mode: 'set',
      uuid: options?.uuid ?? generateUUID(),
   };
}
