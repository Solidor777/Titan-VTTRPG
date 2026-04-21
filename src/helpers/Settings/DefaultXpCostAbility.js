import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default XP cost for Ability Items.
 * @returns {number} The default XP cost for Ability Items.
 */
export default function defaultXpCostAbility() {
   return getSetting('defaultXpCost.ability');
}
