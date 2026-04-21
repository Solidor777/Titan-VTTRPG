import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Engineering Skill Checks.
 * @returns {string} The default Attribute for Engineering Skill Checks.
 */
export default function defaultAttributeEngineering() {
   return getSetting('defaultAttribute.engineering');
}
