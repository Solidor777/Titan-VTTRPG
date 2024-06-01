import localize from '~/helpers/utility-functions/Localize.js';
import EditShieldTraitsDialogShell from '~/document/types/item/types/shield/dialog/EditShieldTraitsDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for editing the Traits of a Shield item.
 * @param {TitanItem} item - The Item to edit the Traits of.
 * @augments TitanDialog
 */
export default class EditShieldTraitsDialog extends TitanDialog {

   /**
    * Dialog for editing the Traits of a Shield item.
    * @param {TitanItem} item - The Item to edit the Traits of.
    * @augments TitanDialog
    */
   constructor(item) {
      super({
         title: `${localize('editTraits')} (${item.name})`,
         content: {
            class: EditShieldTraitsDialogShell,
            props: {
               item: item,
            },
         },
         id: `edit-shield-traits-dialog-${item._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-shield-traits-dialog');

      return retVal;
   }
}
