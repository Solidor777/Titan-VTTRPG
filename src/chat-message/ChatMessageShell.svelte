<script>
   import { autoScroll } from "~/helpers/svelte-actions/AutoScroll.js";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import CheckChatMessageShell from "../check/chat-message/CheckChatMessageShell.svelte";

   // Context object
   export let documentStore = void 0;

   // Setup
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

   // Selector for the chat message type
   function selectComponent() {
      const chatComponents = {
         attributeCheck: CheckChatMessageShell,
         skillCheck: CheckChatMessageShell,
         resistanceCheck: CheckChatMessageShell,
      };
      return chatComponents[$document.flags.titan.data.chatContext.type];
   }
</script>

<div use:autoScroll>
   <svelte:component this={selectComponent()} />
</div>
