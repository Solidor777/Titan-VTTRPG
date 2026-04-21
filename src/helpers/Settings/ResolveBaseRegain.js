import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns the base amount of Resolve regained at the start of a Combatant's turn.
 * @returns {number} The base amount of Resolve regained at the start of a Combatant's turn.
 */
export default function resolveBaseRegain() {
   return getSetting('resolveBaseRegain');
}
