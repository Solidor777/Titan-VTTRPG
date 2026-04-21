import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Resolve is automatically spent when Checks have a Resolve Cost.
 * @returns {boolean} Whether Resolve is automatically spent when Checks have a Resolve Cost.
 */
export default function autoSpendResolveChecks() {
   return getSetting('autoSpendResolveChecks');
}
