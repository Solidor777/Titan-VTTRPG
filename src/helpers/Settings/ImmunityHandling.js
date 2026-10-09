import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Immunity Handling setting value: what happens to a condition or effect a Character already has when it
 * gains an immunity to it.
 * @returns {string} 'remove' (the default: it is deleted) or 'suppress' (it stays, suppressed).
 */
export default function immunityHandling() {
   return getSetting('immunityHandling');
}
