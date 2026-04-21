import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether spending Resolve is reported in a Chat Message.
 * @returns {boolean} Whether spending Resolve is reported in a Chat Message.
 */
export default function reportSpendingResolve() {
   return getSetting('reportSpendingResolve');
}
