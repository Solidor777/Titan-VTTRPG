import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for displaying a message on a Character's turn.
 * @typedef {object} TurnMessageElement
 * @property {string}   operation   The operation to be performed by the Rules Element (turnMessage).
 * @property {string}   selector    Whether to display the message at the start or end of the Character's turn.
 * @property {string}   message     The message to display.
 * @property {string}   uuid        Unique identifier for the Rules Element.
 *                                  Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for displaying a message on a Character's turn.
 * @param {string?}  uuid  Unique identifier for the Rules Element. Used when changing Rules Element types.
 *                         If none is provided, one will be generated.
 * @returns {TurnMessageElement} The new Rules Element.
 */
export default function createTurnMessageElement(uuid) {
   return {
      operation: 'turnMessage',
      selector: 'turnStart',
      message: '',
      uuid: uuid ?? generateUUID(),
   };
}
