/**
 * A Rules Element for healing a Character every turn.
 * @typedef {object} FastHealingElement
 * @property {string}   operation   The operation to be performed by the Rules Element (fastHealing).
 * @property {string}   selector    Whether to apply the healing at the start or end of the Character's turn.
 * @property {integer}   value       The value by which to  heal the Character.
 * @property {string}   uuid        Unique identifier for the Rules Element.
 *                                  Used to help keep track of the element when changing types.
 */

import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Creates a Rules Element for healing a Character every turn.
 * @param {string?}  uuid  Unique identifier for the Rules Element. Used when changing Rules Element types.
 *                         If none is provided, one will be generated.
 * @returns {FastHealingElement} The new Rules Element.
 */
export default function createFastHealingElement(uuid) {
   return {
      operation: 'fastHealing',
      selector: 'turnStart',
      value: 1,
      uuid: uuid ?? generateUUID(),
   };
}
