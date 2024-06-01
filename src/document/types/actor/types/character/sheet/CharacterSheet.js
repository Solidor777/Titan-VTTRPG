import TitanActorSheet from '~/document/types/actor/sheet/ActorSheet';
import createCharacterSheetState from '~/document/types/actor/types/character/sheet/CharacterSheetState.js';

export default class TitanCharacterSheet extends TitanActorSheet {
   deleteItem(itemId) {
      this.applicationState.deleteItem(itemId);
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-character-sheet');

      return retVal;
   }

   _createReactiveState(options = {}) {
      return createCharacterSheetState();
   }
}
