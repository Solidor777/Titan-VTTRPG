import TitanDialog from '~/helpers/dialogs/Dialog.js';
import EditCustomTraitDialogShell from '~/document/types/item/dialog/EditCustomTraitDialogShell.svelte';

/**
 * Dialog for editing the Custom Trait of an Item.
 * @param {Document} document - The Item to edit the Traits of.
 * @param {number} traitIdx - The idx of the Trait in the traits array.
 * @augments TitanDialog
 */
export default class EditCustomTraitDialog extends TitanDialog {

   /**
    * Dialog for editing the Custom Trait of an Item.
    * @param {TitanItem} item - The Item to edit the Traits of.
    * @param {number} traitIdx - The idx of the Trait in the traits array.
    * @augments TitanDialog
    */
   constructor(item, traitIdx) {
      super({
         title: `${item.name}`,
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

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-custom-trait-dialog');

      return retVal;
   }
}
