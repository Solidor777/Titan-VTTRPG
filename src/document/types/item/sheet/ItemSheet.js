import localize from '~/helpers/utility-functions/Localize.js';
import TitanDocumentSheet from '~/document/sheet/DocumentSheet';
import {IMPORT_ICON, SEND_TO_CHAT_ICON} from '~/system/Icons.js';
import createItemSheetState from '~/document/types/item/sheet/ItemSheetState.js';

/**
 * Base sheet for Titan Items.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanItemSheet extends TitanDocumentSheet {

   /**
    * Base Item sheet for Titan Items.
    * @param {Document} document - The document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(document, options = {}) {
      super(document, options);
      this.item = document;
   }

   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         baseApplication: 'ItemSheet',
         width: 700,
         height: 650,
      });
   }

   _getSheetID(document) {
      return `titan-item-sheet-${document.id}`;
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-item-sheet');

      return retVal;
   }

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
      return this.item.collection.importFromCompendium(this.item.compendium, this.item.id);
   }

   /**
    * Adds an Item Check to this sheet's application state.
    */
   addCheck() {
      this.applicationState.addCheck();
   }

   /**
    * Removes the Check at the provided idx from this sheet's application station.
    * @param {number} idx - The idx of the check to remove.
    */
   async removeCheck(idx) {
      this.applicationState.removeCheck(idx);
   }

   _createReactiveState() {
      return createItemSheetState();
   }
}
