import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Resolve is automatically spent when Doubling Expertise.
 * @returns {boolean} Whether Resolve is automatically spent when Doubling Expertise.
 */
export default function autoSpendResolveDoubleExpertise() {
   return getSetting('autoSpendResolveDoubleExpertise');
}
