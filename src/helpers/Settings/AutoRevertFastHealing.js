import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-revert Fast Healing setting value.
 * @returns {string} The Auto-revert Fast Healing setting value.
 */
export default function autoRevertFastHealing() {
   return getSetting('autoRevertFastHealing');
}
