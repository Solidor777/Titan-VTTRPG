import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/**
 * All traits specific to Shield items.
 * @type {StandardTrait[]}
 */
export const SHIELD_TRAITS = deepFreeze([
   {
      name: 'magical',
      value: false,
   },
]);

/**
 * Keys for the localized description strings for Shield Traits, mapped to the Trait name.
 * @type {object}
 */
export const SHIELD_TRAIT_DESCRIPTIONS = deepFreeze({
   magical: 'armor.magical.desc'
});