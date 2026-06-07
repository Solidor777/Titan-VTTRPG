import { teardownMessageMounts } from '~/document/types/chat-message/ChatMessageMountRegistry.js';

/**
 * Tears down all of a TITAN chat message's mounted Svelte components (main log, notification pane,
 * popout) when the message is deleted.
 * @param {ChatMessage} message - The Chat Message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   if (message?.id) {
      teardownMessageMounts(message.id);
   }
}
