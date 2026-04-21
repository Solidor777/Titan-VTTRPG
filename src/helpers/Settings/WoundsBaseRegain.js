import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the base number of Wounds healed when a Character takes a Long Rest.
 * @returns {number} The base number of Wounds healed when a Character takes a Long Rest.
 */
export default function woundsBaseRegain() {
   return getSetting('woundsBaseRegain');
}
