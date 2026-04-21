import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-remove Expired Effects setting value.
 * @returns {string} The Auto-remove Expired Effects setting value.
 */
export default function autoRemoveExpiredEffects() {
   return getSetting('autoRemoveExpiredEffects');
}
