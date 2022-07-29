<script>
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

<svelte:component this={selectComponent(chatContext)} {chatContext} />
