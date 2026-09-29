import isModifierActive from '~/helpers/utility-functions/IsModifierActive.js';
import resolveCheckOptionsMode from '~/helpers/utility-functions/ResolveCheckOptionsMode.js';

/**
 * Determines whether a check opens its options dialog before rolling. The `getCheckOptions` setting chooses never,
 * situational (only when a situational modifier applies to the check), or always. Holding the modifier key inverts the
 * choice, treating `situational` as "no dialog", but a check with situational modifiers always hedges toward showing
 * the dialog. With `never`, the dialog opens only while the key is held. With `situational`, it opens when the key is
 * held or situational modifiers apply. With `always`, it opens without the key, and with the key only when situational
 * modifiers apply.
 * @param {boolean} hasSituationalModifiers - Whether any situational modifier applies to the check.
 * @returns {boolean} Whether to open the check options dialog.
 */
export default function shouldGetCheckOptions(hasSituationalModifiers) {
   /** @type {string} The resolved setting choice. */
   const mode = resolveCheckOptionsMode(game.settings.get('titan', 'getCheckOptions'));

   /** @type {boolean} Whether the modifier key is held. */
   const modifierActive = isModifierActive();

   switch (mode) {
      case 'never': {
         return modifierActive;
      }
      case 'always': {
         return modifierActive ? hasSituationalModifiers : true;
      }
      default: {
         return modifierActive || hasSituationalModifiers;
      }
   }
}
