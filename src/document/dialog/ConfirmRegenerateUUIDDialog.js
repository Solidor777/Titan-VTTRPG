import localize from '~/helpers/utility-functions/Localize.js';
import regenerateDocumentUUID from '~/helpers/utility-functions/RegenerateDocumentUUID.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';

/**
 * A dialog for regenerating the UUID used by Titan Macros for identifying a Document.
 * @extends {ConfirmationDialog}
 */
export default class ConfirmRegenerateUUIDDialog extends ConfirmationDialog {

   /**
    * Configures the confirmation prompt and registers the callback that regenerates the Document's UUID on confirm.
    * @param {TitanItem | TitanActor} document - The Document to regenerate the UUID for.
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
