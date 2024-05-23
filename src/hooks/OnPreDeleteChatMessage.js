/**
 * OnPreDeleteChatMessage hook.
 * Deletes the svelte components from messages before they are deleted.
 * @param {ChatMessage} message - The chat message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   // Check if this chat message was sent by the titan system and has a svelte component
   if (message?.flags.titan && typeof (message._svelteComponent?.$destroy) === 'function') {

      // If so, delete the svelte component
      message._svelteComponent.documentStore.destroy();
      message._svelteComponent.$destroy();
   }
}
