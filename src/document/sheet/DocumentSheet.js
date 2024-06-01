import {SvelteApplication} from '@typhonjs-fvtt/runtime/svelte/application';
import {TJSDocument} from '@typhonjs-fvtt/runtime/svelte/store/fvtt/document';
import {writable} from 'svelte/store';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import localize from '~/helpers/utility-functions/Localize.js';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import {SETTINGS_ICON} from '~/system/Icons.js';

/**
 * A replacement Document Sheet to that supports svelte components.
 * @param {Document} document - The document this sheet is for.
 * @param {object} options - Options object.
 */
export default class TitanDocumentSheet extends SvelteApplication {
   /**
    * A replacement Document Sheet to that supports svelte components.
    * @param {Document} document - The document this sheet is for.
    * @param {object} options - Options object.
    */
   constructor(document, options = {}) {
      // Initialize options objects
      options.svelte ??= {};

      // Set base properties for the sheet
      super(foundry.utils.mergeObject(
         options,
         {
            title: document.name,
            token: null,
            svelte: {
               props: {
                  document: null,
               },
               class: DocumentSheetShell,
            },
         },
      ));

      // Get sheet id
      this.options.id = this._getSheetID(document);

      // Add the sheet classes
      this.options.classes.push(...this._getSheetClasses());

      // Initialize the reactive  document
      this.document = document;
      this.options.svelte.props.document = this._createReactiveDocument(this.document, {delete: this.close.bind(this)});

      // Initialize the reactive state
      this.applicationState = this._createReactiveState();
      this.options.svelte.props.applicationState = this.applicationState;

      // Holds the subscription / unsubscription functions
      this.documentUnsubscribe = void 0;
   }

   /**
    * Default Application options.
    * @returns {object} Options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 700,
         height: 'auto',
         baseApplication: 'DocumentSheet',
         resizable: true,
         minimizable: true,
         dragDrop: [{dragSelector: '.directory-list .item', dropSelector: null}],
         svelte: {
            target: document.body,
         },
      });
   }

   /**
    * Getter function for the document this sheet is for.
    * @returns {Document} The document this sheet is for.
    */
   get object() {
      return this.document;
   }

   /**
    * Returns whether this application is currently editable.
    * True is editable in the options, the user is the document owner, and the document is not in a locked pack.
    * @returns {boolean} Whether the document is editable.
    * @protected
    */
   get isEditable() {

      // If editable and owner
      if (this.options.editable && this.document.isOwner) {

         // If not in a locked pack
         if (this.document.pack) {
            const pack = game.packs.get(this.document.pack);
            return !pack?.locked;
         }
         return true;
      }
      return false;
   }

   /**
    * Overridable function for getting the sheet application ID.
    * @param {Document} document - The document this sheet is fore.
    * @returns {string} The application ID to use for this sheet.
    * @protected
    */
   _getSheetID(document) {
      return `titan-document-sheet-${document.id}`;
   }

   /**
    * Overridable function for getting the sheet classes.
    * @returns {string[]} Array of classes to add to the sheet.
    * @protected
    */
   _getSheetClasses() {
      const retVal = ['titan', 'titan-titan-document-sheet'];

      // Add dark mode class if dark mode enabled
      if (getSetting('darkModeSheets')) {
         retVal.push('titan-dark-mode');
      }

      return retVal;
   }

   /**
    * Overridable function for creating the reactive document store for this sheet.
    * @param {Document} document - The document being stored.
    * @param {object} options - Options for the reactive document store.
    * @returns {TJSDocument<Document>} The newly created document store.
    * @protected
    */
   _createReactiveDocument(document, options = {}) {
      return new TJSDocument(document, options);
   }

   /**
    * Overridable function for creating the reactive state store for this sheet.
    * @param {object} options - Options for the reactive state store.
    * @returns {object} The newly created state store.
    * @protected
    */
   _createReactiveState(options = {}) {
      return new writable(options);
   }

   /**
    * Overridable function for creating the header buttons for this sheet.
    * @returns {ApplicationHeaderButton[]} Array of button objects.
    * @protected
    */
   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      // Sheet configuration button for documents not in a compendium
      if (!this.document.pack) {
         buttons.unshift({
            class: 'configure-sheet',
            icon: SETTINGS_ICON,
            title: localize('openSheetConfigurator'),
            onclick: (event) => this._onConfigureSheet(event),
         });
      }

      return buttons;
   }

   /**
    * Creates a dialog for configuring the sheet.
    * @param {Event} event - The DOM Event from clicking the button.
    * @returns {Application} The newly created Document Sheet Config dialog.
    * @protected
    */
   _onConfigureSheet(event) {
      if (event) {
         event.preventDefault();
      }

      return new DocumentSheetConfig(this.document, this._getDialogOffset()).render(true);
   }

   /**
    * Overridable function for getting the offset of a dialog created by this sheet.
    * @returns {{top: number, left: number}} The offset from the location of this sheet to create a new dialog at.
    * @protected
    */
   _getDialogOffset() {
      return {
         top: this.position.top + 40,
         left: this.position.left + (this.position.width - this.options.width) / 2,
      };
   }

   /**
    * Closes the sheet and unsubscribes from changes to the reactive stores.
    * @param {object} [options] - Options which affect how the Application is closed.
    * @returns {Promise<void>} A Promise which resolves once the application is closed.
    */
   async close(options = {}) {
      // Unsubscribe from the document if still subscribed
      if (this.documentUnsubscribe) {
         this.documentUnsubscribe();
         this.documentUnsubscribe = void 0;
      }

      return super.close(options);
   }

   /**
    * Called internally by the subscription to the document store to update this sheet when appropriate.
    * @param {Document} document - The document that was updated.
    * @param {object} options - The document update options and action.
    * @returns {Promise<void>}
    * @protected
    */
   async _onDocumentUpdated(document, options) {
      // If the action was to update or subscribe to this document
      const {action} = options;
      if ((action === void 0 || action === 'update' || action === 'subscribe') && document) {

         // Update the name of this sheet.
         this.reactive.title = document?.name ?? 'No Document Assigned';
      }
   }

   /**
    * Called to render the sheet.
    * Subscribes to the document store if appropriate.
    * @param {boolean} force - Whether to force the sheet to render.
    * @param {object} options - Options for rendering the sheet.
    * @returns {TitanDocumentSheet} This sheet after rendering.
    */
   render(force = false, options = {}) {

      // Subscribe to the document if not already subscribed
      if (!this.documentUnsubscribe) {
         this.documentUnsubscribe = this.options.svelte.props.document.subscribe(this._onDocumentUpdated.bind(this));
      }

      super.render(force, options);
      return this;
   }

   /**
    * Define whether a user is able to begin a dragstart workflow for a given drag selector.
    * @param {string} selector - The candidate HTML selector for dragging.
    * @returns {boolean} Whether the current user drag this selector.
    * @protected
    */
   _canDragStart(selector) {
      return this.isEditable;
   }

   /**
    * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
    * @param {string} selector - The candidate HTML selector for the drop target.
    * @returns {boolean} Whether current user can drop on this selector.
    * @protected
    */
   _canDragDrop(selector) {
      return this.isEditable;
   }
}
