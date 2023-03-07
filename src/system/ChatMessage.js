import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store';
import { getSetting } from '~/helpers/Utility';
import ChatMessageShell from '~/chat-message/ChatMessageShell.svelte';

const CHAT_MESSAGE_TYPES = Object.freeze(new Set([
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
   'effectsExpiredReport'
]));

export function onRenderChatMessage(message, html) {
   // Check if this is a valid titan chat message
   const chatContext = message?.flags?.titan;
   if (CHAT_MESSAGE_TYPES.has(chatContext?.type)) {
      // Add the titan class
      const content = html.find('.chat-message').prevObject;
      content.addClass('titan');

      // Adder the owner class
      if (message.isOwner) {
         content.addClass('owner');
      }

      // Add the dark mode class
      if (getSetting('darkModeChatMessages') !== 'disabled') {
         content.addClass('titan-dark-mode');
      }

      // Add the svelte component
      const documentStore = new TJSDocument(message);
      message._svelteComponent = new ChatMessageShell({
         target: html[0],
         props: {
            documentStore: documentStore,
         }
      });
   }
   else if (getSetting('darkModeChatMessages') === 'all') {
      // Add the titan class
      const content = html.find('.chat-message').prevObject;
      content.addClass('titan-dark-mode');
   }
}

export function onPreDeleteChatMessage(message) {
   // Check if this is a valid titan chat message
   const flagData = message.getFlag('titan', 'data');
   if (typeof flagData === 'object' && typeof message?._svelteComponent?.$destroy === 'function') {
      // If so, delete the svelte component
      message._svelteComponent.$destroy();
   }
}