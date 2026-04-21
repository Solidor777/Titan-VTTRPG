import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Stealth Skill Checks.
 * @returns {string} The default Attribute for Stealth Skill Checks.
 */
export default function defaultAttributeStealth() {
   return getSetting('defaultAttribute.stealth');
}
