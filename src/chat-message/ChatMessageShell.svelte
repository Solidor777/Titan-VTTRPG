<script>
   import { autoScroll } from "~/helpers/svelte-actions/AutoScroll.js";
   import CheckChatMessageShell from "../check/chat-message/CheckChatMessageShell.svelte";

   // Context object
   export let chatContext = void 0;

   // Selector for the chat message type
   function selectComponent() {
      const chatComponents = {
         resistanceCheck: CheckChatMessageShell,
      };
      return chatComponents[chatContext.type];
   }
</script>

<div use:autoScroll>
   <svelte:component this={selectComponent()} {chatContext} />
</div>
