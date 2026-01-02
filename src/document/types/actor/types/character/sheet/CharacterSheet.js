import TitanActorSheet from '~/document/types/actor/sheet/ActorSheet';
import createCharacterSheetState from '~/document/types/actor/types/character/sheet/CharacterSheetState.js';
import mergeArrays from "~/helpers/utility-functions/MergeArrays.js";

/**
 * An Actor Sheet class with functionality shared by all Characters.
 * @param {Document} sheetDocument - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanCharacterSheet extends TitanActorSheet {
   /**
    * An Actor Sheet class with functionality shared by all Characters.
    * @param {Document} sheetDocument - The document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-character-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Initialize object
      super(sheetDocument, options);
   };

   /**
    * Handles removing an Item from the application state's item collection.
    * @param {string} itemId - ID of the Item deleted to remove.
    */
   deleteItem(itemId) {
      this.applicationState.deleteItem(itemId);
   }

   _createReactiveState(options = {}) {
      return createCharacterSheetState();
   }
}
