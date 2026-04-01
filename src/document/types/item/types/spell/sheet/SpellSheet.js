import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import SpellSheetShell from '~/document/types/item/types/spell/sheet/SpellSheetShell.svelte';
import createSpellSheetState from '~/document/types/item/types/spell/sheet/SpellSheetState';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Spell Items.
 * @param {TitanItem} sheetDocument - The Document this sheet is for.
 * @param {object} options - Options object.
 * @property {SpellSheetState} applicationState - Reactive store for managing the state of the Spell Sheet.
 */
export default class TitanSpellSheet extends TitanItemSheet {
   /**
    * An Item Sheet class with functionality shared by all Spell Items.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes
      const classes = ['titan-spell-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: SpellSheetShell,
               },
            },
         }
      );

      // Initialize self object.
      super(sheetDocument, options);
   };

   /**
    * Adds a Custom Aspect to this sheet's application state.
    */
   addCustomAspect() {
      this.applicationState.addCustomAspect();
   }

   /**
    * Removes the Custom Aspect at the provided idx from this sheet's application state.
    * @param {number} idx - The idx of the aspect to remove.
    */
   removeCustomAspect(idx) {
      this.applicationState.removeCustomAspect(idx);
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @returns {SpellSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createSpellSheetState(/** @type {TitanItem} */ this.document);
   }
}
