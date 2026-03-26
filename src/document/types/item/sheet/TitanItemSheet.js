import localize from '~/helpers/utility-functions/Localize.js';
import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import { IMPORT_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import createRulesElementItemSheetState from '~/document/types/item/sheet/RulesElementItemSheetState.js';

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
      // Add sheet classes
      const classes = ['titan-item-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Initialize self object.
      super(/** @type foundry.abstract.Document */ sheetDocument, options);

      /** @type {TitanItem} The Item this sheet represents.*/
      this.item = sheetDocument;
   }

   /**
    * Default Application options.
    * @override
    * @returns {object} Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         baseApplication: 'ItemSheet',
         height: 650,
      });
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @override
    * @returns {ItemSheetState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      // By default, assume we have rules elements since only spells do not
      return createRulesElementItemSheetState(this.item);
   }

   /**
    * Get the header buttons for the sheet.
    * @override
    * @returns {object[]} Array of button configuration objects.
    * @protected
    */
   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      // Button for sending the item to chat
      buttons.unshift({
         class: 'send-to-chat',
         icon: SEND_TO_CHAT_ICON,
         label: localize('sendToChat'),
         onclick: () => this.item.sendToChat(),
      });

      // Button for importing the item from a compendium pack
      if (this.item.pack) {
         buttons.unshift({
            class: 'import',
            icon: IMPORT_ICON,
            label: localize('import'),
            onclick: (event) => this._onImport(event),
         });
      }

      return buttons;
   }

   /**
    * Imports the Item from a compendium pack.
    * @param {Event} event - The DOM Event from clicking the button.
    * @returns {Promise<void>} Returns after the document has been imported.
    * @private
    */
   _onImport(event) {
      if (event) {
         event.preventDefault();
      }
      return this.item.collection.importFromCompendium(this.item.compendium, this.item._id);
   }

   /**
    * Adds an Item Check to this sheet's application state.
    * @returns {void}
    */
   addCheck() {
      this.applicationState.addCheck();
   }

   /**
    * Removes the Check at the provided idx from this sheet's application state.
    * @param {number} idx - The idx of the check to remove.
    * @returns {void}
    */
   removeCheck(idx) {
      this.applicationState.removeCheck(idx);
   }
}
