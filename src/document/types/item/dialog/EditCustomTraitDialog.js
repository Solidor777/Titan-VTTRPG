import TitanDialog from '~/helpers/dialogs/Dialog.js';
import EditCustomTraitDialogShell from '~/document/types/item/dialog/EditCustomTraitDialogShell.svelte';

/**
 * Dialog for editing the Custom Trait of an Item.
 * @extends {TitanDialog}
 */
export default class EditCustomTraitDialog extends TitanDialog {

   /**
    * Builds the dialog window and passes the target Item and trait index to the custom-trait editor shell.
    * @param {TitanItem | TitanActiveEffect} item - The Item to edit the Traits of.
    * @param {number} traitIdx - The idx of the Trait in the traits array.
    */
   constructor(item, traitIdx) {
      super({
         title: `${item.name}`,
         classes: ['titan-edit-custom-trait-dialog'],
         content: {
            class: EditCustomTraitDialogShell,
            props: {
               item: item,
               traitIdx: traitIdx
            },
         },
         id: `titan-edit-custom-trait-dialog-${item._id}`,
      });
   }
}
