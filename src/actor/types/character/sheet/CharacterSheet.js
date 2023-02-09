import TitanActorSheet from "~/actor/sheet/ActorSheet";
import createCharacterSheetState from "./CharacterSheetState";
import CharacterSheetInventoryAddItemDialog from "~/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryAddItemDialog";

export default class TitanCharacterSheet extends TitanActorSheet {
   constructor(object) {
      super(object);
      this.reactive.state = createCharacterSheetState();
   }

   addInventoryItem() {
      if (this.reactive.document.isOwner) {
         const dialog = new CharacterSheetInventoryAddItemDialog(this.reactive.document);
         dialog.render(true);
      }
      return;
   }

   // Delete Item from the sheet state
   deleteItem(itemId) {
      this.reactive.state.deleteItem(itemId);

      return;
   }
}