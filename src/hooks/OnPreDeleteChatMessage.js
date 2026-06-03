/**
 * Tears down a TITAN chat message's mounted Svelte component when the message is deleted.
 * @param {ChatMessage} message - The Chat Message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   message?._teardownComponent?.();
}
