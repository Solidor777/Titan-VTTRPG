import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Diplomacy Skill Checks.
 * @returns {string} The default Attribute for Diplomacy Skill Checks.
 */
export default function defaultAttributeDiplomacy() {
   return getSetting('defaultAttribute.diplomacy');
}
