import { mount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import themeCoreMessages from '~/helpers/Settings/ThemeCoreMessages.js';
import localize from '~/helpers/utility-functions/Localize.js';
import warn from '~/helpers/utility-functions/Warn.js';
import { extractScalingChange } from '~/check/types/casting-check/ScalingAspectChange.js';
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
    * Writes a change to the message. Core lets only the message's author and a GM write it. The one write relayed to
    * the active GM's client is what a casting check card's scaling controls make for a user who owns the speaking
    * actor but did not author the card: an update with no operation options whose only differences from the stored
    * results are the scaling aspects' values and the figures derived from them. Every other write, including any with
    * `operation` options, other fields or dotted keys that expand to other fields, goes to core unchanged, which
    * refuses what the user may not do. The returned promise settles when the GM's client has answered; a refusal or no
    * answer shows the user a warning.
    * Hidden coupling: `onRelayChatMessageUpdate` answers the request and checks the sender's ownership itself.
    * @override
    * @param {object} [data] - The changes to write.
    * @param {object} [operation] - Options forwarded to core.
    * @returns {Promise<TitanChatMessage>} The message.
    */
   async update(data = {}, operation = {}) {
      if (this.canUserModify(game.user, 'update') || !ChatMessage.getSpeakerActor(this.speaker)?.isOwner) {
         return super.update(data, operation);
      }

      /** @type {number[]|null} The requested aspect values when the write is a scaling-control write. */
      const currentValues = this.type === 'castingCheck' && Object.keys(operation).length === 0 ?
         extractScalingChange(this.system.toObject().results, foundry.utils.expandObject(data)) :
         null;
      if (!currentValues) {
         return super.update(data, operation);
      }
      try {
         await game.titan.socketManager.request('relayChatMessageUpdate', this.id, currentValues);
      }
      catch (error) {
         warn(`The change to the card was not made: ${error.message}`);
      }
      return this;
   }

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
            insertVisibilityBadge(html, this);
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
 * Inserts the visibility badge into the card header: a full-width row breaking onto its own header
 * line, left-aligned under the speaker name (the hidden core whisper-recipient line's position).
 * @param {HTMLElement} html - The rendered chat-message element.
 * @param {TitanChatMessage} message - The message being rendered.
 */
function insertVisibilityBadge(html, message) {
   // The visibility label key: GM-only for blind messages, secret for other whispers, else public.
   let labelKey = 'publicMessage';
   if (message.blind) {
      labelKey = 'gmOnlyMessage';
   }
   else if (message.whisper.length > 0) {
      labelKey = 'secretMessage';
   }

   // The badge inside its line-breaking row, appended after the header's first line.
   const badge = document.createElement('span');
   badge.classList.add('titan-visibility-badge');
   badge.textContent = localize(labelKey);
   const row = document.createElement('div');
   row.classList.add('titan-visibility-row');
   row.append(badge);
   html.querySelector('.message-header')?.append(row);
}
