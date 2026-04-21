import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Athletics Skill Checks.
 * @returns {string} The default Attribute for Athletics Skill Checks.
 */
export default function defaultAttributeAthletics() {
   return getSetting('defaultAttribute.athletics');
}
