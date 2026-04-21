import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the default Attribute for Arcana Skill Checks.
 * @returns {string} The default Attribute for Arcana Skill Checks.
 */
export default function defaultAttributeArcana() {
   return getSetting('defaultAttribute.arcana');
}
