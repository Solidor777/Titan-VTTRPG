import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Lore Skill Checks.
 * @returns {string} The default Attribute for Lore Skill Checks.
 */
export default function defaultAttributeLore() {
   return getSetting('defaultAttribute.lore');
}
