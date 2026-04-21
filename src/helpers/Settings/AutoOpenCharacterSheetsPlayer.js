import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Character Sheets are automatically opened for Players when their turn starts in Combat.
 * @returns {boolean} Whether Character Sheets are automatically opened for Players when their turn starts in Combat.
 */
export default function autoOpenCharacterSheetsPlayer() {
   return getSetting('autoOpenCharacterSheetsPlayer');
}
