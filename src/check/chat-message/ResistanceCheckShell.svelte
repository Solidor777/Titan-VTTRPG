<script>
   import CheckLabel from "./components/CheckLabel.svelte";
   import CheckDiceContainer from "./components/CheckDiceContainer.svelte";
   import { autoScroll } from "~/helpers/svelte-actions/AutoScroll.js";

   // Context object
   export let chatContext = void 0;
</script>

<div class="check-chat-message" use:autoScroll>
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
