import DocumentAddCustomTraitDialogShell from '~/document/dialogs/DocumentAddCustomTraitDialogShell.svelte';
import TitanDialog from '~/helpers/dialogs/Dialog.js';

/**
 * Base dialog for adding a custom trait to a document.
 * @param {Document} document - The Document to add the custom trait to.
 * @augments TitanDialog
 */
export default class DocumentAddCustomTraitDialog extends TitanDialog {
   /**
    * Base dialog for adding a custom trait to a document.
    * @param {Document} document - The Document to add the custom trait to.
    * @augments TitanDialog
    */
   constructor(document) {
      super(
         {
            title: `${document.name}`,
            content: {
               class: DocumentAddCustomTraitDialogShell,
               props: {
                  document: document,
               },
            },
            zIndex: null,
            id: `titan-add-custom-trait-dialog-${document._id}`,
         },
      );
   }

   _getDialogClasses() {
      const retVal = super._getDialogClasses();
      retVal.push('titan-add-custom-trait-dialog-');

      return retVal;
   }
}
