import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the base multiplier for a Character's maximum Wounds.
 * @returns {number} The base multiplier for a Character's maximum Wounds.
 */
export default function woundsBaseMultiplier() {
   return getSetting('woundsBaseMultiplier');
}
