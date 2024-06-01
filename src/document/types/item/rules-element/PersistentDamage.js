import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for dealing damage to a Character every turn.
 * @typedef {object} PersistentDamageElement
 * @property {string} operation The operation to be performed by the Rules Element (persistentDamage).
 * @property {string} selector Whether to apply the damage at the start or end of the Character's turn.
 * @property {number} value The value by which to damage the Character.
 * @property {string} uuid Unique identifier for the Rules Element.
 * Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for dealing damage to a Character every turn.
 * @param {object?} options - Options for the rules element.
 * @returns {PersistentDamageElement} The new Rules Element.
 */
export default function createPersistentDamageElement(options) {
   return {
      operation: 'persistentDamage',
      selector: 'turnStart',
      value: 1,
      uuid: options.uuid ?? generateUUID(),
   };
}
