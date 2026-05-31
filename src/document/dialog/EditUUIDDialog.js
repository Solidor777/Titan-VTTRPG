import localize from '~/helpers/utility-functions/Localize.js';
import EditUUIDDialogShell from '~/document/dialog/EditUUIDDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Dialog for editing the UUID used by Titan Macros for identifying a Document.
 * @extends {TitanDialog}
 */
export default class EditUUIDDialog extends TitanDialog {

   /**
    * Builds the dialog window and passes the target Document to the editor shell component.
    * @param {TitanItem | TitanActor} document - The Document to edit the UUID for.
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

   /**
    * @override
    * @returns {string[]} Array of CSS classes to apply to the dialog element.
    * @protected
    */
   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-edit-uuid-trait-dialog');

      return retVal;
   }
}
