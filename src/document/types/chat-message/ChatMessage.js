import { mount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import themeCoreMessages from '~/helpers/Settings/ThemeCoreMessages.js';
import localize from '~/helpers/utility-functions/Localize.js';
import {
   registerMount,
   sweepStaleMounts,
} from '~/document/types/chat-message/ChatMessageMountRegistry.js';

/**
 * Extends the base Chat Message class so TITAN chat message subtypes render their own Svelte
 * component. Subtyped messages reuse Foundry's standard card chrome (via super.renderHTML) and mount
 * a Svelte component into the card's content region; all other messages render unchanged apart from
 * optionally joining the TITAN chat surface via the titan-core-themed class. One message renders
 * into up to THREE elements (main chat log,
 * notification pane, chat popout — plus per-message chat popout windows), each through its own
 * renderHTML call; every mount is tracked per element in the chat-message mount registry.
 * @extends {ChatMessage}
 */
export default class TitanChatMessage extends ChatMessage {
   /**
    * Renders the chat message HTML. For TITAN subtypes, mounts the subtype's Svelte component into
    * the standard card content region and tracks it per rendered element.
    * @override
    * @param {object} [options] - Options forwarded to the base renderer.
    * @returns {Promise<HTMLElement>} The rendered chat message element.
    */
   async renderHTML(options) {
      // Reap tracked mounts whose elements have left the DOM (closed popouts, sidebar re-renders).
      sweepStaleMounts();

      // Build Foundry's standard card chrome (header, content region, controls).
      const html = await super.renderHTML(options);

      // Non-TITAN messages render unchanged unless the user opted to theme core messages, in which
      // case the card joins the TITAN chat surface (background + visibility tint, no badge).
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         if (themeCoreMessages()) {
            html.classList.add('titan-core-themed');
            applyVisibilityClass(html, this);
         }
         return html;
      }

      // Apply TITAN styling classes.
      html.classList.add('titan');
      if (this.isOwner) {
         html.classList.add('owner');
      }
      applyVisibilityClass(html, this);
      insertVisibilityBadge(html, this);

      // Mount the subtype's Svelte component into the card content region and track it per element.
      // The ReactiveDocument bridge needs no explicit teardown: its createSubscriber hooks self-clean
      // when the component unmounts.
      const bridge = new ReactiveDocument(this);
      const handle = mount(ChatMessageContent, {
         target: html.querySelector('.message-content'),
         props: {
            documentStore: bridge,
         },
      });
      registerMount(html, this.id, handle);

      // Foundry replaces a re-rendered card's predecessor element AFTER this render returns
      // (ChatLog##rerenderMessage → replaceWith); sweep again once the DOM settles so the
      // predecessor's mount is reaped in the same frame.
      requestAnimationFrame(() => sweepStaleMounts());

      return html;
   }
}

/**
 * Adds the visibility tint class for non-public messages.
 * @param {HTMLElement} html - The rendered chat-message element.
 * @param {TitanChatMessage} message - The message being rendered.
 */
function applyVisibilityClass(html, message) {
   if (message.blind) {
      html.classList.add('titan-gm-only');
   }
   else if (message.whisper.length > 0) {
      html.classList.add('titan-secret');
   }
}

/**
 * Inserts the centered visibility badge into the card header for non-public messages.
 * @param {HTMLElement} html - The rendered chat-message element.
 * @param {TitanChatMessage} message - The message being rendered.
 */
function insertVisibilityBadge(html, message) {
   // Public messages carry no badge.
   if (!message.blind && message.whisper.length === 0) {
      return;
   }

   // The badge element, labeled by visibility and slotted before the header metadata.
   const badge = document.createElement('span');
   badge.classList.add('titan-visibility-badge');
   badge.textContent = localize(message.blind ? 'gmOnlyMessage' : 'secretMessage');
   const header = html.querySelector('.message-header');
   const metadata = header?.querySelector('.message-metadata');
   if (metadata) {
      metadata.before(badge);
   }
   else {
      header?.append(badge);
   }
}
