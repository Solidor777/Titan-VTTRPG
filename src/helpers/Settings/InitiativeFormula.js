import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Initiative Formula setting value.
 * @returns {string} The Initiative Formula setting value.
 */
export default function initiativeFormula() {
   return getSetting('initiativeFormula');
}
