import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for conditionally modifying a Character's Rating.
 * @typedef {object} ConditionalRatingModifierElement
 * @property {string} operation The operation to be performed by the Rules Element (conditionalRatingModifier).
 * @property {string} rating The rating to modify (accuracy, melee, or defense).
 * @property {string} selector The type of condition for modifying the rating (any, attribute, trait, etc.).
 * @property {string} key The specific result of the condition for modifying the rating (body, melee, etc).
 * @property {string} uuid Unique identifier for the Rules Element.
 * Used to help keep track of the element when changing types.
 */

/**
 * Creates a Rules Element for conditionally modifying a Character's Rating.
 * @param {string?} uuid - Unique identifier for the Rules Element. Used when changing Rules Element types.
 * If none is provided, one will be generated.
 * @returns {ConditionalRatingModifierElement} The new Rules Element.
 */
export default function createConditionalRatingModifierElement(uuid) {
   return {
      operation: 'conditionalRatingModifier',
      rating: 'accuracy',
      selector: 'attackTrait',
      key: 'blast',
      value: 1,
      uuid: uuid ?? generateUUID(),
   };
}
