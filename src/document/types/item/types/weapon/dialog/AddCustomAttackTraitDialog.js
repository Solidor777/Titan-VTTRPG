import AddCustomAttackTraitDialogShell
   from '~/document/types/item/types/weapon/dialog/AddCustomAttackTraitDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for adding a Custom Trait to an Attack.
 * @extends {TitanDialog}
 */
export default class AddCustomAttackTraitDialog extends TitanDialog {
   /**
    * Builds the dialog window and passes the target Item and attack index to the custom-trait editor shell.
    * @param {TitanItem} document - The Item to add the Trait to.
    * @param {number} attackIdx - The idx of the Attack in the attacks array.
    */
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
         id: `add-custom-attack-trait-dialog-${document.id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-add-custom-attack-trait-dialog');

      return retVal;
   }
}
