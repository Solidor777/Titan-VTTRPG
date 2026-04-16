/**
 * Called on a Chat Message to destroy the Svelte component before it is deleted.
 * @param {ChatMessage} message - The chat message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   // Check if this chat message was sent by the titan system and has a Svelte.
   // component.
   if (message?.flags.titan && typeof (message._svelteComponent?.$destroy) === 'function') {

      // If so, delete the Svelte component.
      message._svelteComponent.documentStore.destroy();
      message._svelteComponent.$destroy();
   }
}
