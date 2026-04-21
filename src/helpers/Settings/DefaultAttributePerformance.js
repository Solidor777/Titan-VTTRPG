import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Performance Skill Checks.
 * @returns {string} The default Attribute for Performance Skill Checks.
 */
export default function defaultAttributePerformance() {
   return getSetting('defaultAttribute.performance');
}
