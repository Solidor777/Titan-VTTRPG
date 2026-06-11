import { mount, unmount } from 'svelte';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import resolveDocumentSheetArguments from '~/helpers/utility-functions/ResolveDocumentSheetArguments.js';

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

   /** @type {object | undefined} The mounted header-buttons Svelte component handle. */
   #headerMountHandle = void 0;

   /**
    * Resolves the polymorphic constructor arguments and applies the default CSS classes to the sheet.
    * @param {foundry.abstract.Document} sheetDocument - The Document this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Resolve the polymorphic constructor arguments. Foundry v14 constructs DocumentSheetV2 applications as
      // `new Sheet({ document })`, while TITAN subclasses pass the document positionally; both must work.
      const { document: resolvedDocument, options: resolvedOptions } =
         resolveDocumentSheetArguments(sheetDocument, options);

      // Add default classes.
      const classes = ['titan', 'titan-document-sheet'];
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
    * Overridable factory for the always-visible header-buttons Svelte component mounted into the window
    * header. Subclasses return a component; the base mounts nothing.
    * @returns {import('svelte').Component | undefined} The header-buttons component, or undefined for none.
    * @protected
    */
   _getHeaderButtonsComponent() {
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
            context: new Map([['application', this]]),
         });
      }
   }

   /**
    * Mount the always-visible header-buttons Svelte tree into the window header on first render. The
    * tree is anchored before the controls (ellipsis) button and shares the application and reactive
    * document via context, mirroring the content shell mount.
    * @override
    * @param {object} context - Prepared render context (unused).
    * @param {object} options - Render options forwarded from the first-render lifecycle.
    * @returns {Promise<void>} Resolves once the header tree is mounted.
    * @protected
    */
   async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);

      // The per-type header-buttons component, if any.
      const headerButtons = this._getHeaderButtonsComponent();
      if (headerButtons) {
         this.#headerMountHandle = mount(headerButtons, {
            target: this.window.header,
            anchor: this.window.controls,
            context: new Map([
               ['application', this],
               ['document', this.#bridge],
            ]),
         });
      }
   }

   /**
    * Tear down the Svelte tree and the bridge when the window closes.
    * @override
    * @param {object} options - Settings forwarded from the Application close lifecycle.
    * @protected
    */
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
      if (this.#headerMountHandle) {
         unmount(this.#headerMountHandle, { outro: true });
         this.#headerMountHandle = void 0;
      }
      this.#bridge?.destroy();
   }
}
