import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/**
 * @typedef {object} StandardTrait
 * A standardized trait used by various items.
 * @property {string} name The name and identifier of the trait.
 * @property {boolean|number} value The value of the trait.
 */

/**
 * All traits specific to Armor items.
 * @type StandardTrait[]
 */
export const ARMOR_TRAITS = deepFreeze([
   {
      name: 'magical',
      value: false,
   },
   {
      name: 'loud',
      value: false,
   },
   {
      name: 'encumbering',
      value: false,
   },
   {
      name: 'heavy',
      value: false,
   }
]);

/**
 * Keys for the localized description strings for Armor Traits, mapped to the Trait name.
 * @type object
 */
export const ARMOR_TRAIT_DESCRIPTIONS = deepFreeze({
   magical: 'armor.magical.desc',
   loud: 'armor.loud.desc',
   encumbering: 'armor.encumbering.desc',
   heavy: 'armor.heavy.desc',
});