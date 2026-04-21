import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-revert Persistent Damage setting value.
 * @returns {string} The Auto-revert Persistent Damage setting value.
 */
export default function autoRevertPersistentDamage() {
   return getSetting('autoRevertPersistentDamage');
}
