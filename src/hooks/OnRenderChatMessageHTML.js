import { mount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import darkModeChatMessages from '~/helpers/Settings/DarkModeChatMessages.js';
import ChatMessageShell from '~/document/types/chat-message/ChatMessageShell.svelte';
import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {Set<string>} List of Titan Chat Message types. */
const TITAN_CHAT_MESSAGE_TYPES = deepFreeze(new Set([
   'attributeCheck',
   'skillCheck',
   'resistanceCheck',
   'attackCheck',
   'castingCheck',
   'itemCheck',
   'armor',
   'ability',
   'commodity',
   'effect',
   'equipment',
   'shield',
   'spell',
   'weapon',
   'turnStartReport',
   'turnEndReport',
   'damageReport',
   'healingReport',
   'spendResolveReport',
   'removeCombatEffectsReport',
   'shortRestReport',
   'longRestReport',
   'effectsExpiredReport',
   'rendReport',
   'repairsReport',
]));

/**
 * Called before a Chat Message is rendered to attach Svelte components and the dark mode class if appropriate.
 * @param {ChatMessage} message - The Chat Message being rendered.
 * @param {HTMLElement} html - The HTML element of the Chat Message.
 */
export default function onRenderChatMessageHTML(message, html) {
   // Check if this is a valid titan chat message.
   const titanFlags = message?.flags?.titan;
   if (TITAN_CHAT_MESSAGE_TYPES.has(titanFlags?.type)) {
      // Add the titan class.
      html.classList.add('titan');

      // Add the owner class if the current user owns the message.
      if (message.isOwner) {
         html.classList.add('owner');
      }

      // Add the dark mode class if dark mode is enabled.
      if (darkModeChatMessages() !== 'disabled') {
         html.classList.add('titan-dark-mode');
      }

      // Add the Svelte component.
      const bridge = new ReactiveDocument(message);
      const handle = mount(ChatMessageShell, {
         target: html.querySelector('.message-content'),
         props: {
            documentStore: bridge,
         },
      });

      // Store the mount handle and bridge for teardown on delete.
      message._svelteComponent = { handle, bridge };
   }

   // If this is not a titan message, but dark mode is enabled for all messages,.
   // add the dark mode class anyway.
   else if (darkModeChatMessages() === 'all') {
      html.classList.add('titan-dark-mode');
   }
}
