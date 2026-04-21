import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default XP cost for Spell Items.
 * @returns {number} The default XP cost for Spell Items.
 */
export default function defaultXpCostSpell() {
   return getSetting('defaultXpCost.spell');
}
