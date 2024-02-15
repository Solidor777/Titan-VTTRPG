import { localize } from '~/helpers/Utility.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';
export default class ConfirmDeleteItemDialog extends ConfirmationDialog {
   constructor(actor, item) {
      super(
         localize('deleteItem'),
         [actor.name, item.name],
         localize('confirmDeleteItem'),
         localize('deleteItem'),
         512,
         512
      );

      this.actor = actor;
      this.itemId = item._id;
   }

   confirmed() {
      if (this.actor) {
         this.actor.deleteItem(this.itemId, true);
      }

      return;
   }
}
