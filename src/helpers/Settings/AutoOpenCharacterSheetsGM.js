import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-open Character Sheets for GM setting value.
 * @returns {string} The Auto-open Character Sheets for GM setting value.
 */
export default function autoOpenCharacterSheetsGM() {
   return getSetting('autoOpenCharacterSheetsGM');
}
