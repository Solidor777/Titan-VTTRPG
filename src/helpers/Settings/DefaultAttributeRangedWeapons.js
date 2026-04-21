import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Ranged Weapons Skill Checks.
 * @returns {string} The default Attribute for Ranged Weapons Skill Checks.
 */
export default function defaultAttributeRangedWeapons() {
   return getSetting('defaultAttribute.rangedWeapons');
}
