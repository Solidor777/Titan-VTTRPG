import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether Resolve is automatically spent when Doubling Training.
 * @returns {boolean} Whether Resolve is automatically spent when Doubling Training.
 */
export default function autoSpendResolveDoubleTraining() {
   return getSetting('autoSpendResolveDoubleTraining');
}
