import localize from '~/helpers/utility-functions/Localize.js';
import EditUUIDDialogShell from '~/document/dialog/EditUUIDDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for editing the UUID used by Titan Macros for identifying a Document.
 * @param {TitanItem|TitanActor} document - The Document this sheet is for.ocument to regenerate the UUID for.
 * @extends TitanDialog
 */
export default class EditUUIDDialog extends TitanDialog {

   /**
    * Dialog for editing the UUID used by Titan Macros for identifying a Document.
    * @param {TitanItem|TitanActor} document - The Document this sheet is for.ocument to regenerate the UUID for.
    * @extends TitanDialog
    */
   constructor(document) {
      super({
         title: `${localize('editUUID')} (${document.name})`,
         content: {
            class: EditUUIDDialogShell,
            props: {
               document: document
            },
         },
         id: `edit-uuid-dialog-${document.id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-uuid-trait-dialog');

      return retVal;
   }
}
