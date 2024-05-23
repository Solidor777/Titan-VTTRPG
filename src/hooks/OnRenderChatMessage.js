import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store/fvtt/document';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import ChatMessageShell from '~/document/types/chat-message/ChatMessageShell.svelte';
import deepFreeze from '~/helpers/utility-functions/DeepFreeze';

const CHAT_MESSAGE_TYPES = deepFreeze(new Set([
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
 * @param message
 * @param html
 */
export default function onRenderChatMessage(message, html) {
   // Check if this is a valid titan chat message
   const chatContext = message?.flags?.titan;
   if (CHAT_MESSAGE_TYPES.has(chatContext?.type)) {
      // Add the titan class
      const content = html.find('.chat-message').prevObject;
      content.addClass('titan');

      // Adder the owner class if the current user owns the message
      if (message.isOwner) {
         content.addClass('owner');
      }

      // Add the dark mode class if dark mode is enabled
      if (getSetting('darkModeChatMessages') !== 'disabled') {
         content.addClass('titan-dark-mode');
      }

      // Add the svelte component
      const document = new TJSDocument(message);
      message._svelteComponent = new ChatMessageShell({
         target: $(html).find('.message-content')[0],
         props: {
            documentStore: document,
         },
      });
   }

   // If this is not a titan message, but dark mode is enabled for all messages, add the dark mode class anyway
   else if (getSetting('darkModeChatMessages') === 'all') {
      const content = html.find('.chat-message').prevObject;
      content.addClass('titan-dark-mode');
   }
}
