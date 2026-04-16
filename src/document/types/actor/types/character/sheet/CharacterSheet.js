import TitanActorSheet from '~/document/types/actor/sheet/TitanActorSheet.js';
import createCharacterSheetState from '~/document/types/actor/types/character/sheet/CharacterSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Actor Sheet class with functionality shared by all Characters.
 * @extends {TitanActorSheet}
 * @property {CharacterSheetState} applicationState - Reactive store for managing the state of the Character Sheet.
 */
export default class TitanCharacterSheet extends TitanActorSheet {
   /**
    * @param {TitanActor} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-character-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      super(sheetDocument, options);
   }

   /**
    * Called after an Item is added to this Actor.
    * @override
    * @param {TitanItem} item - The Item that was just created.
    */
   postAddItem(item) {
      this.applicationState.postAddItem(item);
   }

   /**
    * Called before an Item is removed from this Actor.
    * @override
    * @param {TitanItem} item - The Item being deleted.
    */
   preDeleteItem(item) {
      this.applicationState.preDeleteItem(item);
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @override
    * @returns {CharacterSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createCharacterSheetState(/** @type {TitanActor} */ this.document);
   }

}
