import localize from '~/helpers/utility-functions/Localize.js';
import CreateItemMacroDialogShell from '~/document/types/item/dialog/CreateItemMacroDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * A dialog window for creating and Item macro.
 * @param {TitanItem} item - The Item to create the macro for.
 * @param {number} slot - The hotbar slot to assign the macro to after creation.
 * @param {uuid} uuid - The unique identifier of the object.
 * @augments TitanDialog
 */
export default class CreateItemMacroDialog extends TitanDialog {

   /**
    * A dialog window for creating and Item macro.
    * @param {TitanItem} item - The Item to create the macro for.
    * @param {number} slot - The hotbar slot to assign the macro to after creation.
    * @param {uuid} uuid - The unique identifier of the object.
    * @augments TitanDialog
    */
   constructor(item, slot, uuid) {
      super({
         title: `${localize('createMacro')} (${item.name})`,
         content: {
            class: CreateItemMacroDialogShell,
            props: {
               item: item,
               slot: slot,
               uuid: uuid
            },
         },
         id: `titan-create-macro-dialog-${item._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-macro-dialog', 'titan-item-macro-dialog');

      return retVal;
   }
}
