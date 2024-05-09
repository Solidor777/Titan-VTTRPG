import TitanActorSheet from '~/document/types/actor/sheet/ActorSheet';
import CharacterSheetInventoryAddItemDialog
   from '~/document/types/actor/types/character/sheet/tabs/inventory/CharacterSheetInventoryAddItemDialog';

export default class TitanCharacterSheet extends TitanActorSheet {
   addInventoryItem() {
      if (this.actor.isOwner) {
         const dialog = new CharacterSheetInventoryAddItemDialog(this.actor);
         dialog.render(true);
      }
   }

   // Delete Item from the sheet state
   deleteItem(itemId) {
      this.applicationState.deleteItem(itemId);
   }

   // Add the npc sheet class
   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-character-sheet');

      return retVal;
   }
}
