import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Repairing Armor is reported in a Chat Message.
 * @returns {boolean} Whether Repairing Armor is reported in a Chat Message.
 */
export default function reportRepairingArmor() {
   return getSetting('reportRepairingArmor');
}
