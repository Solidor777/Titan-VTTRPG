import { localize } from '~/helpers/Utility.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';
export default class confirmRemoveExpiredEffectsDialog extends ConfirmationDialog {
   constructor(sheet, itemName, itemId) {
      super(
         `${localize('removeExpiredEffects')}`,
         [sheet.reactive.document.name, itemName],
         localize('confirmRemoveExpiredEffects'),
         localize('confirm'),
         250,
         210
      );

      this.sheet = sheet;
      this.itemId = itemId;
   }

   confirmFunction() {
      if (this.sheet) {
         this.sheet.deleteItem(this.itemId, true);
      }
   }
}
