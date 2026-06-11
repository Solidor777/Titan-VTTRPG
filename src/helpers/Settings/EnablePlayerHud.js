import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Reads whether the Player HUD is enabled.
 * @returns {boolean} True if the HUD should be shown.
 */
export default function enablePlayerHud() {
   return getSetting('enablePlayerHud');
}
