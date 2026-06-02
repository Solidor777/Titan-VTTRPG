import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Reads whether the native Effect HUD is enabled.
 * @returns {boolean} True if the HUD should be shown.
 */
export default function effectHudEnabled() {
   return getSetting('enableEffectHud');
}
