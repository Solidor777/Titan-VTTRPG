import TitanDialog from '~/helpers/dialogs/Dialog.js';
import AddCustomTraitDialogShell from '~/document/types/item/dialog/AddCustomTraitDialogShell.svelte';

/**
 * Dialog for adding a Custom Trait to an Item.
 * @param {TitanItem} item - The Item to add the Trait to.
 * @extends TitanDialog
 */
export default class AddCustomTraitDialog extends TitanDialog {
   /**
    * Dialog for adding a Custom Trait to an Item.
    * @param {TitanItem} item - The Item to add the Trait to.
    * @extends TitanDialog
    */
   constructor(item) {
      super({
         title: `${item.name}`,
         classes: ['titan-add-custom-item-trait-dialog'],
         content: {
            class: AddCustomTraitDialogShell,
            props: {
               item: item,
            },
         },
         id: `titan-add-custom-trait-dialog-${item.id}`,
      });
   }
}
