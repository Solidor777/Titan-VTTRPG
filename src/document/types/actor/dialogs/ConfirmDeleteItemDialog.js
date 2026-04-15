import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';

/**
 * A confirmation dialog for deleting an Item from the Actor.
 * @extends {ConfirmationDialog}
 */
export default class ConfirmDeleteItemDialog extends ConfirmationDialog {

   /**
    * @param {TitanActor} actor - The Actor to delete the Item from.
    * @param {TitanItem} item - The Item to delete from the Actor.
    */
   constructor(actor, item) {
      super(
         localize('deleteItem'),
         [
            actor.name,
            item.name,
         ],
         localize('confirmDeleteItem.desc'),
         localize('deleteItem'),
         () => {
            if (this.actor) {
               this.actor.deleteItem(this.itemId);
            }
         },
      );

      this.actor = actor;
      this.itemId = item._id;
   }
}
