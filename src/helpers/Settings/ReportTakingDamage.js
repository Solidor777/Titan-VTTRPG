import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether taking Damage is reported in a Chat Message.
 * @returns {boolean} Whether taking Damage is reported in a Chat Message.
 */
export default function reportTakingDamage() {
   return getSetting('reportTakingDamage');
}
