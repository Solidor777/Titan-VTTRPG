import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Dark Mode Journals is enabled.
 * @returns {boolean} Whether Dark Mode Journals is enabled.
 */
export default function darkModeJournals() {
   return getSetting('darkModeJournals');
}
