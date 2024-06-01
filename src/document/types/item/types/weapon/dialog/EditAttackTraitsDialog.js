import TitanDialog from '~/helpers/dialogs/Dialog.js';
import EditAttackTraitsDialogShell from '~/document/types/item/types/weapon/dialog/EditAttackTraitsDialogShell.svelte';

/**
 * Dialog for editing the Traits of an Attack.
 * @param {TitanItem} item - The Item to edit the Traits of.
 * @param {number} attackIdx - The idx of the Attack in the attacks array.
 * @augments TitanDialog
 */
export default class EditAttackTraitsDialog extends TitanDialog {

   /**
    * Dialog for editing the Traits of an Attack.
    * @param {TitanItem} item - The Item to edit the Traits of.
    * @param {number} attackIdx - The idx of the Attack in the attacks array.
    * @augments TitanDialog
    */
   constructor(item, attackIdx) {
      super({
         title: `${item.name}: ${item.system.attack[attackIdx].label}`,
         content: {
            class: EditAttackTraitsDialogShell,
            props: {
               attackIdx: attackIdx,
               document: item,

            },
         },
         id: `edit-attack-traits-dialog-${item._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-attack-traits-dialog');

      return retVal;
   }
}
