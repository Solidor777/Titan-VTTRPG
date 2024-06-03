/**
 * Action for auto-scrolling to the bottom of the chat log when displaying a chat message with a svelte component.
 * @param {Node} node - The Dom element containing the Svelte component.
 */
export default function autoScroll(node) {
   // Wait until the next frame before executing
   setTimeout(() => {
      // Get the chat message from the nod
      const chatMessage = node.parentNode;

      // Get the chat log from the chat message
      const chatLog = chatMessage.parentNode;

      // Check whether the difference between the current scroll-top and the scroll height is less or equal to the
      // chat message height
      const scrollTop = chatLog.scrollTop;
      const scrollHeight = chatLog.scrollHeight - chatLog.offsetHeight;
      const chatMessageHeight = chatMessage.offsetHeight;
      if (scrollTop + chatMessageHeight >= scrollHeight) {
         // If so, scroll to the bottom
         chatLog.scrollTop = Math.min(chatLog.scrollTop + chatMessageHeight, chatLog.scrollHeight);
      }
   }, 0);
}