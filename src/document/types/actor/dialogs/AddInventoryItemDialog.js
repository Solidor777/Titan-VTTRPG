import TitanDialog from '~/helpers/dialogs/Dialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import AddAddInventoryItemDialogShell from '~/document/types/actor/dialogs/AddAddInventoryItemDialogShell.svelte';

/**
 * A dialog for choosing which type of Item to add to a Character's inventory.
 */
export default class AddInventoryItemDialog extends TitanDialog {
   constructor(actor) {
      super({
         title: `${localize('addNewItem')}`,
         content: {
            class: AddAddInventoryItemDialogShell,
            props: {
               actor: actor,
            },
         },
         id: `add-inventory-item-dialog-${actor._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-add-inventory-dialog');

      return retVal;
   }
}
