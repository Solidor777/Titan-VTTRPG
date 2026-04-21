import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether regenerating a Document UUID requires confirmation.
 * @returns {boolean} Whether regenerating a Document UUID requires confirmation.
 */
export default function confirmRegenerateUUID() {
   return getSetting('confirmRegenerateUUID');
}
