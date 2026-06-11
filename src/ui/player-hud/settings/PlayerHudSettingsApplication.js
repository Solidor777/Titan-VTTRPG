import { mount, unmount } from 'svelte';
import PlayerHudSettingsShell from '~/ui/player-hud/settings/PlayerHudSettingsShell.svelte';

const { ApplicationV2 } = foundry.applications.api;

/**
 * @class PlayerHudSettingsApplication
 * @extends {ApplicationV2}
 * The Player HUD configuration window: per-element toggles and styles, action-menu layout and
 * content gates, the hotbar switch, edit-layout entry, and the reset buttons. Opened from the
 * system settings menu and the HUD's edit toolbar.
 */
export default class PlayerHudSettingsApplication extends ApplicationV2 {
   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /**
    * Default ApplicationV2 options. An explicit position height prevents the v14 auto-height
    * collapse.
    * @override
    */
   static DEFAULT_OPTIONS = {
      classes: ['titan', 'titan-player-hud-settings'],
      id: 'titan-player-hud-settings',
      position: { width: 520, height: 680 },
      window: { resizable: true, minimizable: true, title: 'LOCAL.playerHudSettings.text' },
   };

   /**
    * Prepare render data. The shell reads everything from the settings; nothing is needed here.
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
    * Mount the settings Svelte tree on first render.
    * @override
    * @param {object} result - Value returned from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#mountHandle = mount(PlayerHudSettingsShell, {
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
