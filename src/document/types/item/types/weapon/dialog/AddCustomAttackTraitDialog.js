import AddCustomAttackTraitDialogShell
   from '~/document/types/item/types/weapon/dialog/AddCustomAttackTraitDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for adding a Custom Trait to an Attack.
 * @param {TitanItem} item - The Item to edit the Trait of.
 * @param {number} traitIdx - The idx of the Custom Trait in the traits array.
 * @augments TitanDialog
 */
export default class AddCustomAttackTraitDialog extends TitanDialog {
   constructor(document, attackIdx) {
      super({
         title: `${document.name}: ${document.system.attack[attackIdx].label}`,
         content: {
            class: AddCustomAttackTraitDialogShell,
            props: {
               attackIdx: attackIdx,
               document: document,
            },
         },
         id: `add-custom-attack-trait-dialog-${document._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-add-custom-attack-trait-dialog');

      return retVal;
   }
}
