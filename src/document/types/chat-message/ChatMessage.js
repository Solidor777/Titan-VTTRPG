import { mount, unmount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import darkModeChatMessages from '~/helpers/Settings/DarkModeChatMessages.js';

/**
 * Extends the base Chat Message class so TITAN chat message subtypes render their own Svelte
 * component. Subtyped messages reuse Foundry's standard card chrome (via super.renderHTML) and mount
 * a Svelte component into the card's content region; all other messages render unchanged apart from
 * the dark-mode-'all' styling class.
 * @extends {ChatMessage}
 */
export default class TitanChatMessage extends ChatMessage {
   /** @type {{ handle: object, bridge: ReactiveDocument } | undefined} The mounted Svelte component. */
   _svelteComponent = void 0;

   /**
    * Renders the chat message HTML. For TITAN subtypes, mounts the subtype's Svelte component into
    * the standard card content region.
    * @override
    * @param {object} [options] - Options forwarded to the base renderer.
    * @returns {Promise<HTMLElement>} The rendered chat message element.
    */
   async renderHTML(options) {
      // Build Foundry's standard card chrome (header, content region, controls).
      const html = await super.renderHTML(options);

      // Non-TITAN messages render unchanged, except dark mode applies to every message when the
      // setting is 'all' (previously handled by the deleted legacy renderChatMessageHTML hook).
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         if (darkModeChatMessages() === 'all') {
            html.classList.add('titan-dark-mode');
         }
         return html;
      }

      // Apply TITAN styling classes.
      html.classList.add('titan');
      if (this.isOwner) {
         html.classList.add('owner');
      }
      if (darkModeChatMessages() !== 'disabled') {
         html.classList.add('titan-dark-mode');
      }

      // Tear down any prior mount: the chat log replaces the element on every update.
      this._teardownComponent();

      // Mount the subtype's Svelte component into the card content region.
      const bridge = new ReactiveDocument(this);
      const handle = mount(ChatMessageContent, {
         target: html.querySelector('.message-content'),
         props: {
            documentStore: bridge,
         },
      });
      this._svelteComponent = { handle, bridge };

      return html;
   }

   /**
    * Unmounts the message's Svelte component and tears down its reactive bridge, if mounted.
    * @returns {void}
    */
   _teardownComponent() {
      if (this._svelteComponent?.handle) {
         unmount(this._svelteComponent.handle, { outro: false });
         this._svelteComponent.bridge?.destroy();
         this._svelteComponent = void 0;
      }
   }
}
