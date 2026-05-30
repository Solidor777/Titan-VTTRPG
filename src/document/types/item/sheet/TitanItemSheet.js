import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';
import ItemSheetSendToChatButton from '~/document/types/item/sheet/ItemSheetSendToChatButton.svelte';
import ItemSheetImportItemButton from '~/document/types/item/sheet/ItemSheetImportItemButton.svelte';

/**
 * A Document Sheet class with functionality shared by all Items.
 * @extends {TitanDocumentSheet}
 * @property {RulesElementItemSheetState} applicationState - The reactive application state store.
 */
export default class TitanItemSheet extends TitanDocumentSheet {
   /**
    * @param {TitanItem} sheetDocument - The Document this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add sheet classes.
      const classes = ['titan-item-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      super(/** @type {foundry.abstract.Document} */ sheetDocument, options);

      // Read the resolved document from the base getter; `sheetDocument` may be the v14 `{ document }` options
      // object rather than the document itself.
      /** @property {TitanItem} item - The Item this sheet represents. */
      this.item = this.document;
   }

   /**
    * Default Application options. AppV2 merges `DEFAULT_OPTIONS` down the class chain onto the base
    * defined in TitanDocumentSheet, so only the item-specific height override is needed here.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { height: 650 },
   };

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @override
    * @returns {typeof ItemSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      // By default, assume we have rules elements since only spells do not.
      return createRulesElementItemSheetState(/** @type {TitanItem} */ this.document);
   }

   /**
    * Get the header buttons for the sheet.
    * @override
    * @returns {object[]} Array of button configuration objects.
    * @protected
    */
   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      // Button for sending the item to chat.
      buttons.unshift({
         svelte: {
            class: ItemSheetSendToChatButton,
         }
      });

      // Button for importing the item from a compendium pack.
      if (this.item.pack) {
         buttons.unshift({
            svelte: {
               class: ItemSheetImportItemButton,
            },
         });
      }

      return buttons;
   }

   /**
    * Called after an Item Check is added to this Sheet's Item.
    */
   postAddCheck() {
      this.applicationState.postAddCheck();
   }

   /**
    * Called before an Item Check is deleted from this Sheet's Item.
    * @param {number} idx - The index of the Check about to be deleted.
    */
   preDeleteCheck(idx) {
      this.applicationState.preDeleteCheck(idx);
   }
}
