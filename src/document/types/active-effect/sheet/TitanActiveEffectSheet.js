import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import ActiveEffectSheetShell from '~/document/types/active-effect/sheet/ActiveEffectSheetShell.svelte';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

/**
 * A Document Sheet class for Titan Active Effects of the 'effect' subtype.
 * Mirrors the effect Item sheet (Description / Checks / Rules Elements tabs and a duration header) while
 * targeting native ActiveEffect fields where appropriate (name, img, description, disabled).
 * @property {RulesElementItemSheetState} applicationState - The reactive application state store.
 * @extends {TitanDocumentSheet}
 */
export default class TitanActiveEffectSheet extends TitanDocumentSheet {
   /**
    * Merges the Active Effect sheet CSS classes into the options before delegating to the base document sheet.
    * @param {TitanActiveEffect} sheetDocument - The Active Effect this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-item-sheet', 'titan-effect-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Add Svelte Shell.
      options = foundry.utils.mergeObject(
         options, {
            svelte: {
               props: {
                  shell: ActiveEffectSheetShell,
               },
            },
         },
      );

      super(/** @type {foundry.abstract.Document} */ sheetDocument, options);

      // Read the resolved document from the base getter; `sheetDocument` may be the v14 `{ document }` options
      // object rather than the document itself.
      /** @property {TitanActiveEffect} effect - The Active Effect this sheet represents. */
      this.effect = this.document;
   }

   /**
    * Default Application options. AppV2 merges `DEFAULT_OPTIONS` down the class chain onto the base
    * defined in TitanDocumentSheet. ItemSheetBase (shared with the item sheet) lays out with
    * `height: 100%`, which collapses under the inherited `height: 'auto'`; a fixed height gives the
    * layout a definite basis, mirroring the effect Item sheet.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { height: 650 },
   };

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * The Rules Element Item Sheet state is document-agnostic (it only reads `system.check.length` to seed the
    * expanded-state arrays), so it is reused directly for the effect Active Effect sheet.
    * @override
    * @returns {RulesElementItemSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return createRulesElementItemSheetState(/** @type {TitanActiveEffect} */ this.document);
   }

   /**
    * Called after a Check is added to this Sheet's Active Effect.
    * @returns {void}
    */
   postAddCheck() {
      this.applicationState.postAddCheck();
   }

   /**
    * Called before a Check is deleted from this Sheet's Active Effect.
    * @param {number} idx - The index of the Check about to be deleted.
    * @returns {void}
    */
   preDeleteCheck(idx) {
      this.applicationState.preDeleteCheck(idx);
   }
}
