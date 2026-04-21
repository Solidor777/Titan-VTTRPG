import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Perception Skill Checks.
 * @returns {string} The default Attribute for Perception Skill Checks.
 */
export default function defaultAttributePerception() {
   return getSetting('defaultAttribute.perception');
}
