import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Dark Mode Chat Messages setting value.
 * @returns {string} The Dark Mode Chat Messages setting value.
 */
export default function darkModeChatMessages() {
   return getSetting('darkModeChatMessages');
}
