import { mount, unmount } from 'svelte';
import EffectTrayShell from '~/sidebar/tray/EffectTrayShell.svelte';

/**
 * @class TitanEffectTrayTab
 * @extends {foundry.applications.sidebar.AbstractSidebarTab}
 * A custom sidebar tab presenting the TITAN Effect Tray: a browsable, applicable library of
 * Active Effects backed by any visible ActiveEffect compendium. Mounts a Svelte 5 component tree
 * into the ApplicationV2 content element, mirroring the TitanDocumentSheet mount lifecycle.
 */
export default class TitanEffectTrayTab extends foundry.applications.sidebar.AbstractSidebarTab {

   /** @type {string} The sidebar tab name (matches the Sidebar.TABS key and the CONFIG.ui key). */
   static tabName = 'titanEffects';

   /**
    * Default ApplicationV2 options.
    * @override
    */
   static DEFAULT_OPTIONS = {
      classes: ['titan'],
   };

   /** @type {object | undefined} The mounted Svelte component handle, used to unmount on close. */
   #mountHandle = void 0;

   /** @type {object | undefined} The reactive tray state instance, created lazily on first render. */
   #trayState = void 0;

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
    * Mount the Svelte tray on first render. Subsequent renders are no-ops: reactivity is driven by
    * the tray state's runes and update hooks, not by the ApplicationV2 render cycle.
    * @override
    * @param {object} result - Value returned from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#trayState ??= this.#createTrayState();
         this.#mountHandle = mount(EffectTrayShell, {
            target: content,
            props: {
               trayState: this.#trayState,
            },
            context: new Map([['application', this]]),
         });
      }
   }

   /**
    * Creates the reactive tray state. Stubbed in Task 1; replaced in Task 3 with EffectTrayState.
    * @returns {object} The tray state instance.
    */
   #createTrayState() {
      return {};
   }

   /**
    * Tear down the Svelte tree when the tab application closes.
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
   }
}
