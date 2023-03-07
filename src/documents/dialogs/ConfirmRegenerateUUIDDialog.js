import { localize } from '~/helpers/Utility.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';
import { regenerateUUID } from '~/helpers/Utility';
export default class ConfirmRegenerateUUIDDialog extends ConfirmationDialog {
   constructor(document) {
      super(
         localize('regenerateUUID'),
         [document.name],
         localize('confirmRegenerateUUID'),
         localize('regenerate'),
         300,
         250
      );

      this.document = document;
   }

   confirmed() {
      regenerateUUID(this.document);

      return;
   }
}
