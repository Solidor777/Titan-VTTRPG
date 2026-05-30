import { mount, unmount } from 'svelte';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import resolveDocumentSheetArguments from '~/helpers/utility-functions/ResolveDocumentSheetArguments.js';
import darkModeSheets from '~/helpers/Settings/DarkModeSheets.js';

const { DocumentSheetV2 } = foundry.applications.api;

/**
 * @class TitanDocumentSheet
 * @extends {DocumentSheetV2}
 * A Document Sheet that mounts a Svelte 5 component tree into the ApplicationV2 content element.
 */
export default class TitanDocumentSheet extends DocumentSheetV2 {
   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /** @type {ReactiveDocument | undefined} The reactive document bridge. */
   #bridge = void 0;

   /**
    * @param {foundry.abstract.Document} sheetDocument - The Document this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Resolve the polymorphic constructor arguments. Foundry v14 constructs DocumentSheetV2 applications as
      // `new Sheet({ document })`, while TITAN subclasses pass the document positionally; both must work.
      const { document: resolvedDocument, options: resolvedOptions } =
         resolveDocumentSheetArguments(sheetDocument, options);

      // Add default and dark-mode classes.
      const classes = ['titan', 'titan-document-sheet'];
      if (darkModeSheets()) {
         classes.push('titan-dark-mode');
      }
      resolvedOptions.classes = resolvedOptions.classes
         ? mergeArrays(classes, resolvedOptions.classes)
         : classes;

      // DocumentSheetV2 expects the document on the options object and exposes it via `this.document`
      // (a getter — do NOT assign to it). Assign the reference directly; deep-merging it would recurse into
      // the document's read-only collections (items, effects) and throw.
      resolvedOptions.document = resolvedDocument;
      super(resolvedOptions);

      // Build the reactive bridge and the UI-only application state store.
      this.#bridge = new ReactiveDocument(resolvedDocument);
      this.applicationState = this._createReactiveState();
   }

   /**
    * Default ApplicationV2 options.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { width: 700, height: 'auto' },
      window: { resizable: false, minimizable: true },
   };

   /**
    * Overridable factory for the reactive UI-state store. Subclasses override.
    * @returns {object | undefined} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return void 0;
   }

   /**
    * Prepare render data. Props are assembled in `_replaceHTML`; nothing is needed here.
    * @override
    * @param {object} context - Render context (unused).
    * @param {object} options - Render options (unused).
    * @returns {Promise<object>} An empty context object.
    * @protected
    */
   async _renderHTML(context, options) {
      return {};
   }

   /**
    * Mount the Svelte tree on first render. Subsequent renders are no-ops: reactivity is driven by
    * the ReactiveDocument bridge's update hooks, not by the ApplicationV2 render cycle.
    * @override
    * @param {object} result - Value returned from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         // The inner shell component is supplied by the per-type subclass via legacy svelte options.
         const shell = this.options.svelte?.props?.shell;
         this.#mountHandle = mount(DocumentSheetShell, {
            target: content,
            props: {
               document: this.#bridge,
               applicationState: this.applicationState,
               shell,
            },
         });
      }
   }

   /**
    * Tear down the Svelte tree and the bridge when the window closes.
    * @override
    * @param {object} options - Close options.
    * @protected
    */
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
      this.#bridge?.destroy();
   }
}
