import { unmount } from 'svelte';

/**
 * Called on a Chat Message to destroy the Svelte component before it is deleted.
 * @param {ChatMessage} message - The chat message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   // Check if this chat message has a mounted Svelte component.
   const svelteComponent = message?._svelteComponent;
   if (message?.flags.titan && svelteComponent?.handle) {
      // Tear down the bridge hooks, then unmount the component.
      svelteComponent.bridge?.destroy();
      unmount(svelteComponent.handle, { outro: true });
      message._svelteComponent = void 0;
   }
}
