import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Medicine Skill Checks.
 * @returns {string} The default Attribute for Medicine Skill Checks.
 */
export default function defaultAttributeMedicine() {
   return getSetting('defaultAttribute.medicine');
}
