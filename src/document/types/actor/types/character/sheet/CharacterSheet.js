import TitanActorSheet from '~/document/types/actor/sheet/TitanActorSheet.js';
import createCharacterSheetState from '~/document/types/actor/types/character/sheet/CharacterSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Actor Sheet class with functionality shared by all Characters.
 * @param {TitanActor} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 * @property {CharacterSheetState} applicationState - Reactive store for managing the state of the Character Sheet.
 */
export default class TitanCharacterSheet extends TitanActorSheet {
   /**
    * An Actor Sheet class with functionality shared by all Characters.
    * @param {TitanActor} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-character-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Initialize self object.
      super(sheetDocument, options);
   };

   /**
    * Called after an Item is added to this Actor.
    * @param {TitanItem} item - The Item that was just created.
    * @override
    */
   postAddItem(item) {
      // Update the application state.
      this.applicationState.postAddItem(item);
   }

   /**
    * Called before an Item is removed from this Actor.
    * @param {TitanItem} item - The Item being deleted.
    * @override
    */
   preDeleteItem(item) {
      // Update the application state.
      this.applicationState.preDeleteItem(item);
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @returns {CharacterSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createCharacterSheetState();
   }

}
