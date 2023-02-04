import { localize } from '~/helpers/Utility.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog';
export default class CharacterSheetConfirmDeleteItemDialog extends ConfirmationDialog {
   constructor(sheet, itemName, itemId) {
      super(
         `${localize('deleteItem')}`,
         [sheet.reactive.document.name, itemName],
         localize('confirmDeleteItem'),
         localize('deleteItem'),
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
