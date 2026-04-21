import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-regain Resolve setting value.
 * @returns {string} The Auto-regain Resolve setting value.
 */
export default function autoRegainResolve() {
   return getSetting('autoRegainResolve');
}
