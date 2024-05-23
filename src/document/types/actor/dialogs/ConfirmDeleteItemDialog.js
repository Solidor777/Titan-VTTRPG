import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';

/**
 * Creates a confirmation dialog for deleting an Item from the Actor.
 * @param {TitanActor} actor - The Actor to delete the Item from.
 * @param {TitanItem} item - The Item to from the Actor.
 * @augments ConfirmationDialog
 */
export default class ConfirmDeleteItemDialog extends ConfirmationDialog {

   /**
    * Creates a confirmation dialog for deleting an Item from the Actor.
    * @param {TitanActor} actor - The Actor to delete the Item from.
    * @param {TitanItem} item - The Item to from the Actor.
    */
   constructor(actor, item) {
      super(
         localize('deleteItem'),
         [actor.name, item.name],
         localize('confirmDeleteItem.desc'),
         localize('deleteItem'),
         () => {
            if (this.actor) {
               this.actor.system.safeDeleteItem(this.itemId);
            }
         },
      );

      this.actor = actor;
      this.itemId = item._id;
   }
}
