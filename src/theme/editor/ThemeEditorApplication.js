import { mount, unmount } from 'svelte';
import ThemeEditorShell from '~/theme/editor/ThemeEditorShell.svelte';

const { ApplicationV2 } = foundry.applications.api;

/**
 * @class ThemeEditorApplication
 * @extends {ApplicationV2}
 * The TITAN theme editor: pick a theme, duplicate built-ins, edit custom colors and fonts with a live
 * preview, and export / import / reset themes. Opened from the system settings menu.
 */
export default class ThemeEditorApplication extends ApplicationV2 {
   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /**
    * Default ApplicationV2 options. An explicit position height prevents the v14 auto-height
    * collapse.
    * @override
    */
   static DEFAULT_OPTIONS = {
      classes: ['titan', 'titan-theme-editor'],
      id: 'titan-theme-editor',
      position: { width: 960, height: 700 },
      window: { resizable: true, minimizable: true, title: 'LOCAL.themeEditor.text' },
   };

   /**
    * Prepare render data. The shell reads everything from the ThemeManager; nothing is needed here.
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
    * Mount the editor Svelte tree on first render.
    * @override
    * @param {object} result - Value returned from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#mountHandle = mount(ThemeEditorShell, {
            target: content,
            context: new Map([['application', this]]),
         });
      }
   }

   /**
    * Tear down the Svelte tree when the window closes.
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
