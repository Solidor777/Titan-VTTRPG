import { localize } from '~/helpers/Utility.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';
export default class ConfirmRemoveExpiredEffectsDialog extends ConfirmationDialog {
   constructor(character, confirmationCallback, confirmationContext) {
      super(
         localize('removeExpiredEffects'),
         [character.parent.name],
         localize('confirmRemoveExpiredEffects'),
         localize('removeEffects'),
         250,
         210,
         confirmationCallback,
         confirmationContext
      );

      this.character = character;
   }

   confirmed() {
      if (this.character) {
         this.character.removeExpiredEffects(true);
      }
   }
}
