import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Nature Skill Checks.
 * @returns {string} The default Attribute for Nature Skill Checks.
 */
export default function defaultAttributeNature() {
   return getSetting('defaultAttribute.nature');
}
