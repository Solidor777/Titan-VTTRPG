import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Intimidation Skill Checks.
 * @returns {string} The default Attribute for Intimidation Skill Checks.
 */
export default function defaultAttributeIntimidation() {
   return getSetting('defaultAttribute.intimidation');
}
