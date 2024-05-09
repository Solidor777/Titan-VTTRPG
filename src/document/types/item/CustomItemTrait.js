import localize from '~/helpers/utility-functions/Localize.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Contains data for a Custom Item Trait.
 * @typedef {object} CustomItemTrait
 * @property   {boolean}   name        The name for the Trait.
 * @property   {string}    description The description of the trait.
 * @property   {string}    uuid        Generated unique identifier for the Trait.
 */

/**
 * Creates a Custom Item Trait object.
 * @returns {CustomItemTrait} The new Trait object.
 */
export default function createCustomItemTraitTemplate() {
   return {
      name: localize('newTrait'),
      description: '',
      uuid: generateUUID(),
   };
}
