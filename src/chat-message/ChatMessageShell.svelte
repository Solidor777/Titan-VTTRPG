<script>
   import { autoScroll } from "~/helpers/svelte-actions/AutoScroll.js";
   import ResistanceCheckShell from "~/check/chat-message/ResistanceCheckShell.svelte";

   // Context object
   export let chatContext = void 0;

   // Selector for the chat message type
   function selectComponent() {
      const chatComponents = {
         resistanceCheck: ResistanceCheckShell,
      };
      return chatComponents[chatContext.type];
   }
</script>

<div use:autoScroll>
   <svelte:component this={selectComponent(chatContext)} {chatContext} />
</div>
