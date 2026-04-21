import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Deception Skill Checks.
 * @returns {string} The default Attribute for Deception Skill Checks.
 */
export default function defaultAttributeDeception() {
   return getSetting('defaultAttribute.deception');
}
