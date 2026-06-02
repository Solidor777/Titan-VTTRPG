import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';

/**
 * Determines whether we should confirm deleting an effect. This is normally dependent on the system setting, but is
 * inverted if the modifier key is pressed.
 * @returns {boolean} Whether we should confirm deleting an effect.
 */
export default function shouldConfirmDeletingEffects() {
   return isModifierActive() ? false : game.settings.get('titan', 'confirmDeletingEffects');
}
