import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for conditionally modifying a Check made a Character.
 * @typedef {object} ConditionalCheckModifierElement
 * @property {string}   operation      The operation to be performed by the Rules Element (conditionalCheckModifier).
 * @property {string}   modifierType   The part of the check to modify (damage, bonus dice, etc).
 * @property {string}   selector       The type of condition for modifying the rating (any, attribute, trait, etc.).
 * @property {string}   key            The specific result of the condition for modifying the check (body, melee, etc).
 * @property {string}   uuid           Unique identifier for the Rules Element.
 *                                     Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for conditionally modifying a Check made a Character.
 * @param {string?}  uuid  Unique identifier for the Rules Element. Used when changing Rules Element types.
 *                         If none is provided, one will be generated.
 * @returns {ConditionalCheckModifierElement}   The new Rules Element.
 */
export default function createConditionalCheckModifierElement(uuid) {
   return {
      operation: 'conditionalCheckModifier',
      modifierType: 'damage',
      checkType: 'any',
      selector: 'any',
      key: '',
      value: 1,
      uuid: uuid ?? generateUUID(),
   };
}
