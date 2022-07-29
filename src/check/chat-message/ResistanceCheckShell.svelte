<script>
   import CheckLabel from "./components/CheckLabel.svelte";
   import CheckDiceContainer from "./components/CheckDiceContainer.svelte";
   import { onMount } from "svelte";

   // Context object
   export let chatContext = void 0;
   let scrolledDown = false;

   function handleScrollDown(node) {
      if (!scrolledDown) {
         const chatMessage = node.parentNode;
         const chatLog = chatMessage.parentNode;
         console.log(chatLog.scrollTop);
         chatLog.scrollTop += 200;
         scrolledDown = true;
      }
   }
</script>

<div class="check-chat-message" use:handleScrollDown>
   <CheckLabel label={chatContext.label} typeLabel={chatContext.typeLabel} />
   <CheckDiceContainer dice={chatContext.results.dice} />
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .check-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }
</style>
