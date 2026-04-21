import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the base multiplier for a Character's maximum Stamina.
 * @returns {number} The base multiplier for a Character's maximum Stamina.
 */
export default function staminaBaseMultiplier() {
   return getSetting('staminaBaseMultiplier');
}
