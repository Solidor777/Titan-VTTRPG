import TitanItemSheet from '~/document/types/item/sheet/TitanItemSheet.js';
import SpellSheetShell from '~/document/types/item/types/spell/sheet/SpellSheetShell.svelte';
import createSpellSheetState from '~/document/types/item/types/spell/sheet/SpellSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * An Item Sheet class with functionality shared by all Spell Items.
 * @property {SpellSheetState} applicationState - Reactive store for managing the state of the Spell Sheet.
 * @extends {TitanItemSheet}
 */
export default class TitanSpellSheet extends TitanItemSheet {
   /**
    * Merges the Spell sheet CSS class and Svelte shell into the options before delegating to the base Item sheet.
    * @param {TitanItem} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-spell-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: SpellSheetShell,
               },
            },
         }
      );

      super(sheetDocument, options);
   }

   /**
    * Adds a Custom Aspect to this sheet's application state.
    */
   addCustomAspect() {
      this.applicationState.addCustomAspect();
   }

   /**
    * Removes the Custom Aspect at the provided index from this sheet's application state.
    * @param {number} idx - The index of the aspect to remove.
    */
   removeCustomAspect(idx) {
      this.applicationState.removeCustomAspect(idx);
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @override
    * @returns {typeof SpellSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createSpellSheetState(/** @type {TitanItem} */ this.document);
   }
}
