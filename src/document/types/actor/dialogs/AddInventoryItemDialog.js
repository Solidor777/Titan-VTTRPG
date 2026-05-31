import TitanDialog from '~/helpers/dialogs/Dialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import AddAddInventoryItemDialogShell from '~/document/types/actor/dialogs/AddAddInventoryItemDialogShell.svelte';

/**
 * A dialog for choosing which type of Item to add to a Character's inventory.
 */
export default class AddInventoryItemDialog extends TitanDialog {
   /**
    * Builds the dialog window and hands the target Actor to the item-type chooser shell component.
    * @param {TitanActor} actor - The Actor to add the inventory item to.
    */
   constructor(actor) {
      super({
         title: localize('addNewItem'),
         content: {
            class: AddAddInventoryItemDialogShell,
            props: {
               actor: actor,
            },
         },
         id: `add-inventory-item-dialog-${actor.id}`,
      });
   }

   /**
    * @override
    * @returns {string[]} The CSS classes to apply to the dialog.
    * @protected
    */
   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-add-inventory-dialog');

      return retVal;
   }
}
