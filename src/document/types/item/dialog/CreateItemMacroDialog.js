import localize from '~/helpers/utility-functions/Localize.js';
import CreateItemMacroDialogShell from '~/document/types/item/dialog/CreateItemMacroDialogShell.svelte';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * A dialog window for creating an Item macro on a player's hotbar.
 */
export default class CreateItemMacroDialog extends TitanDialog {

   /**
    * A dialog window for creating and Item macro.
    * @param {TitanItem} item - The Item to create the macro for.
    * @param {number} slot - The hotbar slot to assign the macro to after creation.
    * @param {uuid} uuid - The unique identifier of the object.
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
            id: `titan-create-macro-dialog-${item._id}-${generateUUID()}`,
         }
      );
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-macro-dialog', 'titan-item-macro-dialog');

      return retVal;
   }
}
