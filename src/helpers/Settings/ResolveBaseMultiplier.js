import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the base multiplier for a Character's maximum Resolve.
 * @returns {number} The base multiplier for a Character's maximum Resolve.
 */
export default function resolveBaseMultiplier() {
   return getSetting('resolveBaseMultiplier');
}
