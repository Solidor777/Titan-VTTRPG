import { SvelteApplication } from '@typhonjs-fvtt/runtime/svelte/application';
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store/fvtt/document';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import isDarkModeSheetsEnabled from '~/helpers/Settings/DarkModeSheets.js';
import ConfigureSheetButton from '~/document/sheet/ConfigureSheetButton.svelte';

/**
 * @class TitanDocumentSheet
 * @extends {SvelteApplication}
 * A replacement Document Sheet that supports Svelte components.
 * @template {import('svelte/store').Writable<any>} TApplicationState
 */
export default class TitanDocumentSheet extends SvelteApplication {
   /**
    * @param {Document} sheetDocument - The Document this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add default classes
      const classes = ['titan', 'titan-document-sheet'];

      // Add dark mode class if appropriate
      if (isDarkModeSheetsEnabled()) {
         classes.push('titan-dark-mode');
      }

      // Merge the classes with those provided by the options object
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      // Initialize the object with pre-requisite base properties
      super(foundry.utils.mergeObject(
         options,
         {
            id: `titan-document-sheet-${sheetDocument.id}`,
            title: sheetDocument.name,
            svelte: {
               class: DocumentSheetShell,
               target: document.body,
               props: {
                  document: null,
                  applicationState: null,
               },
            },
         },
      ));

      /** @type {Document} The Document this sheet represents. */
      this.document = sheetDocument;

      /**
       * @type {TJSDocument<Document>} Reactive TJSDocument store wrapping the
       *    document, passed to the Svelte component.
       */
      this.options.svelte.props.document = new TJSDocument(
         this.document,
         { delete: this.close.bind(this) }
      );

      /** @type {typeof TApplicationState} The reactive application state store, passed to the Svelte component. */
      this.applicationState = this._createReactiveState();

      /** @type {typeof TApplicationState} The reactive application state store, passed to the Svelte component. */
      this.options.svelte.props.applicationState = this.applicationState;

      /**
       * @type {Function | undefined} The unsubscribe function returned by the
       *    document store subscription, or undefined if not currently
       *    subscribed.
       */
      this.documentUnsubscribe = void 0;
   }

   /**
    * Default Application options.
    * @override
    * @returns {object} Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      let parentOptions = super.defaultOptions;
      return foundry.utils.mergeObject(parentOptions, {
         width: 700,
         height: 'auto',
         baseApplication: 'DocumentSheet',
         resizable: false,
         minimizable: true,
         dragDrop: [{ dragSelector: '.directory-list .item', dropSelector: null }],
      });
   }

   /**
    * Gets the underlying Document object.
    * @type {Document}
    */
   get object() {
      return this.document;
   }

   /**
    * Returns whether this application is currently editable.
    * True if editable in the options, the user is the document owner, and the
    * document is not in a locked pack.
    * @type {boolean}
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
    * Overridable function for creating the reactive state store for this
    * sheet.
    * @returns {typeof TApplicationState} The newly created state store.
    * @protected
    */
   _createReactiveState() {
   }

   /**
    * Overridable function for getting the render options for a dialog created
    * by this sheet.
    * @returns {{force: boolean, position: {top: number, left: number}}} Render
    *    options positioning the dialog
    *    relative to this sheet.
    */
   getDialogRenderOptions() {
      return {
         force: true,
         position: {
            top: this.position.top + 40,
            left: this.position.left + ((this.position.width - this.options.width) / 2) + 10,
         },
      };
   }

   /**
    * Called internally by the subscription to the document store to update this
    * sheet when appropriate.
    * @param {Document} document - The Document that was updated.
    * @param {object} options - Document update options and action.
    * @returns {Promise<void>}
    * @protected
    */
   async _onDocumentUpdated(document, options) {
      // If the action was to update or subscribe to this document
      const { action } = options;
      if ((action === void 0 || action.includes('update') || action.includes('subscribe')) && document) {

         // Update the name of this sheet.
         this.reactive.title = document?.name ?? 'No Document Assigned';
      }
   }

   /**
    * Called to render the sheet.
    * Subscribes to the document store if appropriate.
    * @override
    * @param {boolean} [force=false] - Whether to force the sheet to render.
    * @param {object} [options={}] - Options for rendering the sheet.
    * @returns {this} This sheet after rendering.
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
    * Overridable function for creating the header buttons for this sheet.
    * @override
    * @returns {object[]} Array of button objects.
    * @protected
    */
   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      // Sheet configuration button for documents not in a compendium
      if (!this.document.pack) {
         buttons.unshift({
            svelte: {
               class: ConfigureSheetButton,
            }
         });
      }

      return buttons;
   }

   /**
    * Define whether a user is able to begin a dragstart workflow for a given
    * drag selector.
    * @override
    * @param {string} selector - The candidate HTML selector for dragging.
    * @returns {boolean} Whether the current user drag this selector.
    * @protected
    */
   _canDragStart(selector) {
      return this.isEditable;
   }

   /**
    * Define whether a user is able to conclude a drag-and-drop workflow for a
    * given drop selector.
    * @override
    * @param {string} selector - The candidate HTML selector for the drop
    *    target.
    * @returns {boolean} Whether current user can drop on this selector.
    * @protected
    */
   _canDragDrop(selector) {
      return this.isEditable;
   }

   /**
    * Closes the sheet and unsubscribes from changes to the reactive stores.
    * @override
    * @param {object} [options={}] - Options which affect how the Application is
    *    closed.
    * @returns {Promise<void>} A Promise which resolves once the application is
    *    closed.
    */
   async close(options = {}) {
      // Unsubscribe from the document if still subscribed
      if (this.documentUnsubscribe) {
         this.documentUnsubscribe();
         this.documentUnsubscribe = void 0;
      }

      return super.close(options);
   }
}
