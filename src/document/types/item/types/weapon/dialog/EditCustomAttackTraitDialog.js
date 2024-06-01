import EditCustomTraitDialogShell from '~/document/types/item/dialog/EditCustomTraitDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for editing the Custom Trait of an Attack.
 * @param {TitanItem} item - The Item to edit the Traits of.
 * @param {number} attackIdx - The idx of the Attack in the attacks array.
 * @param {number} traitIdx - The idx of the Trait in the traits array.
 * @augments TitanDialog
 */
export default class EditCustomAttackTraitDialog extends TitanDialog {

   /**
    * Dialog for editing the Custom Trait of an Attack.
    * @param {TitanItem} item - The Item to edit the Traits of.
    * @param {number} attackIdx - The idx of the Attack in the attacks array.
    * @param {number} traitIdx - The idx of the Trait in the traits array.
    * @augments TitanDialog
    */
   constructor(item, attackIdx, traitIdx) {
      super({
         title: `${item.name}: ${item.system.attack[attackIdx].label}`,
         content: {
            class: EditCustomTraitDialogShell,
            props: {
               attackIdx: attackIdx,
               item: item,
               traitIdx: traitIdx,
            },
         },
         id: `edit-custom-attack-traits-dialog-${item._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-custom-attack-trait-dialog');

      return retVal;
   }
}
