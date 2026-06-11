import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether non-TITAN chat messages should receive the TITAN chat theme.
 * @returns {boolean} Whether core-message theming is enabled.
 */
export default function themeCoreMessages() {
   return getSetting('themeCoreMessages');
}
