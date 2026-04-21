import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether healing Damage is reported in a Chat Message.
 * @returns {boolean} Whether healing Damage is reported in a Chat Message.
 */
export default function reportHealingDamage() {
   return getSetting('reportHealingDamage');
}
