import { mount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import themeCoreMessages from '~/helpers/Settings/ThemeCoreMessages.js';
import localize from '~/helpers/utility-functions/Localize.js';
import warn from '~/helpers/utility-functions/Warn.js';
import { applyScalingSteps } from '~/check/types/casting-check/ScalingAspectChange.js';
import {
   registerMount,
   sweepStaleMounts,
} from '~/document/types/chat-message/ChatMessageMountRegistry.js';

/** @type {WeakMap<TitanChatMessage, Promise<void>>} The latest queued change of each message on this client. */
const scalingChangeQueues = new WeakMap();

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
    * Runs a change to this card after every earlier change to it on this client has settled, so changes that are
    * derived from the stored card never read it before the previous change is written. A failure of one change does
    * not stop the ones queued behind it.
    * @param {Function} task - The change to run.
    * @returns {Promise<void>} Settles with the change's outcome.
    */
   #queueChange(task) {
      /** @type {Promise<void>} The earlier changes to this card. */
      const earlier = scalingChangeQueues.get(this) ?? Promise.resolve();

      /** @type {Promise<void>} This change, queued behind them. */
      const change = earlier.then(task);
      scalingChangeQueues.set(this, change.catch(() => {}));
      return change;
   }

   /**
    * Writes a signed number of steps of one scaling aspect, derived from the card as stored when the write runs and
    * queued behind this client's other changes to the card. Used by the author and a GM directly, and by the GM's
    * client to answer a relayed request, so both paths share one queue.
    * @param {number} index - The position of the aspect among the card's scaling aspects.
    * @param {number} steps - The signed number of steps.
    * @returns {Promise<void>} Resolves once the change is written.
    * @throws {Error} The reason when the change is not legal.
    */
   writeScalingSteps(index, steps) {
      return this.#queueChange(async () => {
         await this.update({ system: { results: applyScalingSteps(this.system.toObject().results, index, steps) } });
      });
   }

   /**
    * Changes one scaling aspect of a casting check card by a signed number of steps, which is what the card's Reset,
    * Decrease and Increase controls do. The change is derived from the card as it is stored when it is applied, never
    * from values the control read earlier, and a user's changes run one after another, so quick clicks on different
    * aspects all stay. The author and a GM write the card; a user who only owns the speaking actor asks the active GM's
    * client to write it (core lets only the author and a GM write a message), and any other user's write goes to core,
    * which refuses it. The returned promise settles when the change is written or refused; a refusal shows a warning.
    * Hidden coupling: `onRelayChatMessageUpdate` answers the request, checks the sender's ownership itself and writes
    * through `writeScalingSteps`.
    * @param {number} index - The position of the aspect among the card's scaling aspects.
    * @param {number} steps - The signed number of steps: positive spends extra successes, negative refunds them.
    * @returns {Promise<void>} Resolves once the change has been answered.
    */
   async changeScalingAspect(index, steps) {
      try {
         if (this.canUserModify(game.user, 'update') || !ChatMessage.getSpeakerActor(this.speaker)?.isOwner) {
            await this.writeScalingSteps(index, steps);
         }
         else {
            await this.#queueChange(
               () => game.titan.socketManager.request('relayChatMessageUpdate', this.id, index, steps),
            );
         }
      }
      catch (error) {
         warn(`The change to the card was not made: ${error.message}`);
      }
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
