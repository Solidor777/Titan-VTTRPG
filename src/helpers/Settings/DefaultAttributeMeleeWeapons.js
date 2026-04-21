import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Melee Weapons Skill Checks.
 * @returns {string} The default Attribute for Melee Weapons Skill Checks.
 */
export default function defaultAttributeMeleeWeapons() {
   return getSetting('defaultAttribute.meleeWeapons');
}
