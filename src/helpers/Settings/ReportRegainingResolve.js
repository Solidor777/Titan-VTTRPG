import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether regaining Resolve is reported in a Chat Message.
 * @returns {boolean} Whether regaining Resolve is reported in a Chat Message.
 */
export default function reportRegainingResolve() {
   return getSetting('reportRegainingResolve');
}
