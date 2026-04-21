import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the base multiplier for a Minion or Warrior's maximum Stamina.
 * @returns {number} The base multiplier for a Minion or Warrior's maximum Stamina.
 */
export default function minionStaminaMultiplier() {
   return getSetting('minionStaminaMultiplier');
}
