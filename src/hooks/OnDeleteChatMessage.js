import { teardownMessageMounts } from '~/document/types/chat-message/ChatMessageMountRegistry.js';

/**
 * Tears down all of a TITAN chat message's mounted Svelte components (main log, notification pane,
 * popout) when the message is deleted. Registered on `deleteChatMessage`, which fires on every
 * client for confirmed deletions — `preDeleteChatMessage` fires on the initiating client only,
 * before the deletion is confirmed.
 * @param {ChatMessage} message - The deleted Chat Message.
 * @returns {void}
 */
export default function onDeleteChatMessage(message) {
   if (message?.id) {
      teardownMessageMounts(message.id);
   }
}
