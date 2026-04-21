import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether a Combatant's Effects are reported at the start and end of their turn.
 * @returns {boolean} Whether a Combatant's Effects are reported at the start and end of their turn.
 */
export default function reportEffects() {
   return getSetting('reportEffects');
}
