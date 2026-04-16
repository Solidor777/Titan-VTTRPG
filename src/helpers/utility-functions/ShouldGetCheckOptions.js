import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';

/**
 * Determines whether we should open a dialog for setting check options before rolling a check.
 * This is normally dependent of the system setting, but is inverted if the modifier key is pressed.
 * @returns {boolean} Whether we should open a dialog to set the settings of a check.
 */
export default function shouldGetCheckOptions() {
   const retVal = game.settings.get('titan', 'getCheckOptions') === true;
   return isModifierActive() ? !retVal : retVal;
}
