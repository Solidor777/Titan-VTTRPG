import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Subterfuge Skill Checks.
 * @returns {string} The default Attribute for Subterfuge Skill Checks.
 */
export default function defaultAttributeSubterfuge() {
   return getSetting('defaultAttribute.subterfuge');
}
