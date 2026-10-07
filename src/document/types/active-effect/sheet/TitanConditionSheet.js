import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import ConditionSheetShell from '~/document/types/active-effect/sheet/ConditionSheetShell.svelte';
import createConditionSheetState from '~/document/types/active-effect/sheet/ConditionSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * A Document Sheet class for Titan Active Effects of the 'condition' subtype. It edits the native name, image and
 * description and the condition's rules elements; a condition has no duration, checks or traits, so it offers none.
 * @property {ConditionSheetState} applicationState - The reactive application state store.
 * @extends {TitanDocumentSheet}
 */
export default class TitanConditionSheet extends TitanDocumentSheet {
   /**
    * Merges the condition sheet CSS classes and the Svelte shell into the options before delegating to the base
    * document sheet.
    * @param {TitanActiveEffect} sheetDocument - The condition Active Effect this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = [
         'titan-item-sheet',
         'titan-condition-sheet',
      ];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: ConditionSheetShell,
               },
            },
         },
      );

      super(/** @type {foundry.abstract.Document} */ sheetDocument, options);
   }

   /**
    * Default Application options. The sheet shares ItemSheetBase's `height: 100%` layout, which collapses under the
    * inherited `height: 'auto'`, so a fixed height gives the layout a definite basis.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { height: 650 },
   };

   /**
    * Creates the reactive state store for this sheet.
    * @override
    * @returns {ConditionSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createConditionSheetState(this.document);
   }
}
