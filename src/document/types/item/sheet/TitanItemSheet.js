import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';
import localize from '~/helpers/utility-functions/Localize.js';
import { IMPORT_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';

/**
 * A Document Sheet class with functionality shared by all Items.
 * @property {RulesElementItemSheetState} applicationState - The reactive application state store.
 * @extends {TitanDocumentSheet}
 */
export default class TitanItemSheet extends TitanDocumentSheet {
   /**
    * Merges the Item sheet CSS class into the options before delegating to the base document sheet.
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
    * Build the native AppV2 header controls for this Item sheet. These render in the window's header
    * controls dropdown (the ellipsis menu).
    * @override
    * @returns {ApplicationHeaderControlsEntry[]} The header control entries to render.
    * @protected
    */
   _getHeaderControls() {
      /** @type {ApplicationHeaderControlsEntry[]} The accumulated control entries. */
      const controls = super._getHeaderControls();

      // Send to Chat control: posts this Item to chat.
      controls.push({
         action: 'titanSendToChat',
         icon: SEND_TO_CHAT_ICON,
         label: localize('sendToChat'),
         onClick: () => this.item.sendToChat(),
      });

      // Import control for Items loaded from a compendium pack.
      if (this.item.pack) {
         controls.push({
            action: 'titanImportItem',
            icon: IMPORT_ICON,
            label: localize('importItem'),
            onClick: () => this._onImportItem(),
         });
      }

      return controls;
   }

   /**
    * Import this Item from its compendium pack into the game world.
    * @returns {Promise<Document>} The imported Item document.
    * @protected
    */
   async _onImportItem() {
      return this.item.collection.importFromCompendium(this.item.compendium, this.item.id);
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
