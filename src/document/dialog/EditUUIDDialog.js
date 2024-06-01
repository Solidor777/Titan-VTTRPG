import localize from '~/helpers/utility-functions/Localize.js';
import EditUUIDDialogShell from '~/document/dialog/EditUUIDDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for editing the UUID used by Titan Macros for identifying a Document.
 * @param {TitanItem|TitanActor} document - The document to regenerate the UUID for.
 * @augments TitanDialog
 */
export default class EditUUIDDialog extends TitanDialog {

   /**
    * Dialog for editing the UUID used by Titan Macros for identifying a Document.
    * @param {TitanItem|TitanActor} document - The document to regenerate the UUID for.
    * @augments TitanDialog
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
         id: `edit-uuid-dialog-${document._id}`,
      });
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-uuid-trait-dialog');

      return retVal;
   }
}
