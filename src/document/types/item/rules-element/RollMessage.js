import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * a Rules Element for conditionally displaying a message when a Character rolls a check.
 * @typedef {object} RollMessageElement
 * @property {string}   operation   The operation to be performed by the Rules Element (rollMessage).
 * @property {string}   checkType   The type of check to display the message for (attribute, attack, etc.).
 * @property {string}   selector    The type of condition for displaying the message (any, attribute, trait, etc.).
 * @property {string}   key         The specific result of the condition for displaying the message (body, willpower, etc).
 * @property {string}   message     The message to display.
 * @property {string}   uuid        Unique identifier for the Rules Element.
 *                                  Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for conditionally displaying a message when a Character rolls a check.
 * @param {string?}  uuid  Unique identifier for the Rules Element. Used when changing Rules Element types.
 *                         If none is provided, one will be generated.
 * @returns {RollMessageElement} The new Rules Element.
 */
export default function createRollMessageElement(uuid) {
   return {
      operation: 'rollMessage',
      checkType: 'any',
      selector: 'attribute',
      key: 'body',
      message: '',
      uuid: uuid ?? generateUUID(),
   };
}
