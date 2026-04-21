import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Resting is reported in a Chat Message.
 * @returns {boolean} Whether Resting is reported in a Chat Message.
 */
export default function reportResting() {
   return getSetting('reportResting');
}
