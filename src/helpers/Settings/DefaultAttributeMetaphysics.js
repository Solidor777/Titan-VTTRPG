import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Metaphysics Skill Checks.
 * @returns {string} The default Attribute for Metaphysics Skill Checks.
 */
export default function defaultAttributeMetaphysics() {
   return getSetting('defaultAttribute.metaphysics');
}
