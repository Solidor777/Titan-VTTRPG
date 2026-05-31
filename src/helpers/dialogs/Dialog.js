import { mount, unmount } from 'svelte';
import { Z_INDEX_APP } from '~/system/Constants.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import darkModeSheets from '~/helpers/Settings/DarkModeSheets.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

const { ApplicationV2 } = foundry.applications.api;

/**
 * @class TitanDialog
 * @extends {ApplicationV2}
 * Base dialog that mounts a Svelte 5 component (`options.content.class`) with `options.content.props`.
 */
export default class TitanDialog extends ApplicationV2 {

   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /** @type {{ class: import('svelte').Component, props: object }} The Svelte content descriptor. */
   #content;

   /**
    * Applies the default and theme CSS classes, assigns a unique id, and stores the Svelte content descriptor.
    * @param {object} options - Options for the dialog window. Must include
    * `content: { class, props }` describing the Svelte component to mount.
    */
   constructor(options) {
      const classes = ['titan', 'titan-dialog'];
      if (darkModeSheets()) {
         classes.push('titan-dark-mode');
      }
      options.classes = options.classes ? mergeArrays(classes, options.classes) : classes;
      options.id = options.id ? `${options.id}-${generateUUID()}` : `titan-dialog-${generateUUID()}`;

      // Move a top-level `title` into the AppV2 window options.
      if (options.title !== void 0) {
         options.window = foundry.utils.mergeObject(options.window ?? {}, { title: options.title });
         delete options.title;
      }

      // Capture and strip the Svelte content descriptor before passing options to ApplicationV2.
      const content = options.content;
      delete options.content;

      super(options);

      this.#content = content;
   }

   /**
    * Default ApplicationV2 options.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { width: 320, height: 'auto' },
      window: { resizable: false, minimizable: false },
      zIndex: Z_INDEX_APP,
   };

   /**
    * Prepare render data. The mounted component receives its props directly; nothing needed here.
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
    * Mount the dialog's Svelte content on first render.
    * @override
    * @param {object} result - Value from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#mountHandle = mount(this.#content.class, {
            target: content,
            props: this.#content.props,
            context: new Map([['application', this]]),
         });
      }
   }

   /**
    * Unmount the Svelte content when the dialog closes.
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
