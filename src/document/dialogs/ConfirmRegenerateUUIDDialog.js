import localize from '~/helpers/utility-functions/Localize.js';
import regenerateDocumentUUID from '~/helpers/utility-functions/RegenerateDocumentUUID.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';

/**
 * A dialog for regenerating the UUID used by Titan Macros for identifying a Document.
 * @param {TitanItem|TitanActor} document - The document to regenerate the UUID for.
 * @augments ConfirmationDialog
 */
export default class ConfirmRegenerateUUIDDialog extends ConfirmationDialog {

   /**
    * A dialog for regenerating the UUID used by Titan Macros for identifying a Document.
    * @param {TitanItem|TitanActor} document - The document to regenerate the UUID for.
    * @augments ConfirmationDialog
    */
   constructor(document) {
      super(
         localize('regenerateUUID'),
         [document.name],
         localize('confirmRegenerateUUID.desc'),
         localize('regenerate'),
         () => {
            if (this.document) {
               regenerateDocumentUUID(this.document);
            }
         },
      );

      this.document = document;
   }
}
