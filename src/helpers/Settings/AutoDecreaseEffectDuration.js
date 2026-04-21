import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Returns whether the Duration of Effects is automatically decreased for Combatants.
 * @returns {boolean} Whether the Duration of Effects is automatically decreased for Combatants.
 */
export default function autoDecreaseEffectDuration() {
   return getSetting('autoDecreaseEffectDuration');
}
