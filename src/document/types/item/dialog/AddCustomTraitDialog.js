import TitanDialog from '~/helpers/dialogs/Dialog.js';
import AddCustomAttackTraitDialogShell
   from '~/document/types/item/types/weapon/dialog/AddCustomAttackTraitDialogShell.svelte';

/**
 * Dialog for adding a Custom Trait to an Item.
 * @param {TitanItem} item - The Item to add the Trait to.
 * @augments TitanDialog
 */
export default class AddCustomTraitDialog extends TitanDialog {
   /**
    * Dialog for adding a Custom Trait to an Item.
    * @param {Document} item - The Item to add the Trait to.
    * @augments TitanDialog
    */
   constructor(item) {
      super({
         title: `${item.name}`,
         content: {
            class: AddCustomAttackTraitDialogShell,
            props: {
               item: item,
            },
         },
         id: `titan-add-custom-trait-dialog-${item._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-add-custom-trait-dialog');

      return retVal;
   }
}
