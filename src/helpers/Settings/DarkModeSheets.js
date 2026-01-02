import getSetting from "~/helpers/utility-functions/GetSetting.js";

/**
 * Returns whether Dark Mode Sheets is Enabled.
 * @returns {boolean} - Whether Dark Mode Sheets is Enabled.
 */
export default function isDarkModeSheetsEnabled() {
   return getSetting('darkModeSheets');
}
