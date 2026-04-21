import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the Auto-revert Resolve Regain setting value.
 * @returns {string} The Auto-revert Resolve Regain setting value.
 */
export default function autoRevertResolveRegain() {
   return getSetting('autoRevertResolveRegain');
}
