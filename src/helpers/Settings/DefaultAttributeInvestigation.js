import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Investigation Skill Checks.
 * @returns {string} The default Attribute for Investigation Skill Checks.
 */
export default function defaultAttributeInvestigation() {
   return getSetting('defaultAttribute.investigation');
}
