import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Dark Mode Sheets is enabled.
 * @returns {boolean} Whether Dark Mode Sheets is enabled.
 */
export default function darkModeSheets() {
   return getSetting('darkModeSheets');
}
