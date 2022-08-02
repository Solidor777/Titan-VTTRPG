<script>
   import { autoScroll } from "~/helpers/svelte-actions/AutoScroll.js";
   import { getContext } from "svelte";
   import CheckChatMessageShell from "../check/chat-message/CheckChatMessageShell.svelte";

   // Context object
   export let chatContext = void 0;
   const application = getContext("external");

   // Selector for the chat message type
   function selectComponent() {
      const chatComponents = {
         attributeCheck: CheckChatMessageShell,
         skillCheck: CheckChatMessageShell,
         resistanceCheck: CheckChatMessageShell,
      };
      return chatComponents[chatContext.type];
   }
</script>

<div use:autoScroll>
   <svelte:component this={selectComponent()} {chatContext} />
</div>
