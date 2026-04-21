import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-apply Fast Healing setting value.
 * @returns {string} The Auto-apply Fast Healing setting value.
 */
export default function autoApplyFastHealing() {
   return getSetting('autoApplyFastHealing');
}
