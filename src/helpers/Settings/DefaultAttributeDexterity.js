import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Dexterity Skill Checks.
 * @returns {string} The default Attribute for Dexterity Skill Checks.
 */
export default function defaultAttributeDexterity() {
   return getSetting('defaultAttribute.dexterity');
}
