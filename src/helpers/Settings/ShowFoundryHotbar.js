import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Reads whether the core Foundry hotbar should be visible.
 * @returns {boolean} True if the hotbar should be shown.
 */
export default function showFoundryHotbar() {
   return getSetting('showFoundryHotbar');
}
