import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import ActiveEffectSheetHeaderButtons from '~/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte';
import ActiveEffectSheetShell from '~/document/types/active-effect/sheet/ActiveEffectSheetShell.svelte';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';
import localize from '~/helpers/utility-functions/Localize.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';

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
    * Supply the always-visible effect header-buttons component for the window header.
    * @override
    * @returns {import('svelte').Component} The component rendering the send-to-chat button.
    * @protected
    */
   _getHeaderButtonsComponent() {
      return ActiveEffectSheetHeaderButtons;
   }

   /**
    * Build the native AppV2 header controls for this Active Effect sheet, adding a Send-to-Chat entry
    * so the action is reachable from the controls dropdown as well as the inline header button.
    * @override
    * @returns {ApplicationHeaderControlsEntry[]} The header control entries to render.
    * @protected
    */
   _getHeaderControls() {
      /** @type {ApplicationHeaderControlsEntry[]} The accumulated control entries. */
      const controls = super._getHeaderControls();

      // Send to Chat control: posts this Active Effect to chat.
      controls.push({
         action: 'titanSendEffectToChat',
         icon: SEND_TO_CHAT_ICON,
         label: localize('sendToChat'),
         onClick: () => this.effect.sendToChat(),
      });

      return controls;
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
