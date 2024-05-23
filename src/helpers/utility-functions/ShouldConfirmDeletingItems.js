import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';

/**
 * Determines whether we should confirm deleting an item.
 * This is normally dependent of the system setting,
 * but is inverted if the modifier key is pressed.
 * @returns {boolean} Whether we should confirm deleting an item.
 */
export default function shouldConfirmDeletingItems() {
   return isModifierActive() ? false : game.settings.get('titan', 'confirmDeletingItems');
}
