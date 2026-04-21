import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-apply Persistent Damage setting value.
 * @returns {string} The Auto-apply Persistent Damage setting value.
 */
export default function autoApplyPersistentDamage() {
   return getSetting('autoApplyPersistentDamage');
}
