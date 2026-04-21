import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Rending Armor is reported in a Chat Message.
 * @returns {boolean} Whether Rending Armor is reported in a Chat Message.
 */
export default function reportRendingArmor() {
   return getSetting('reportRendingArmor');
}
