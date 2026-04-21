import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Resolve is automatically spent when Re-Rolling Failures.
 * @returns {boolean} Whether Resolve is automatically spent when Re-Rolling Failures.
 */
export default function autoSpendResolveReRollFailures() {
   return getSetting('autoSpendResolveReRollFailures');
}
