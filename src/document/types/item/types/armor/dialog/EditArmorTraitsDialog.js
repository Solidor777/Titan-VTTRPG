import localize from '~/helpers/utility-functions/Localize.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';
import EditArmorTraitsDialogShell from '~/document/types/item/types/armor/dialog/EditArmorTraitsDialogShell.svelte';

/**
 * Dialog for editing the Traits of an Armor item.
 * @param {TitanItem} item - The Item to edit the Traits of.
 * @augments TitanDialog
 */
export default class EditArmorTraitsDialog extends TitanDialog {

   /**
    * Dialog for editing the Traits of an Armor item.
    * @param {TitanItem} item - The Item to edit the Traits of.
    * @augments TitanDialog
    */
   constructor(item) {
      super({
         title: `${localize('editTraits')} (${item.name})`,
         content: {
            class: EditArmorTraitsDialogShell,
            props: {
               item: item,
            },
         },
         id: `edit-armor-traits-dialog-${item._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-armor-traits-dialog');

      return retVal;
   }
}
