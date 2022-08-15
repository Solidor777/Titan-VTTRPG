<script>
   import CheckChatDiceContainer from "./CheckChatDiceContainer.svelte";
   import CheckChatLabel from "./CheckChatLabel.svelte";
   import CheckChatResults from "./CheckChatResults.svelte";
   import { getContext } from "svelte";
   import CheckDamageButtons from "./CheckDamageButtons.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");
</script>

<div class="check-chat-message">
   <CheckChatLabel />
   <CheckChatDiceContainer />
   <CheckChatResults />
   {#if $document.flags.titan.data.chatContext.results.damage && game.user.isGM}
      <CheckDamageButtons />
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   @import "../../styles/Variables.scss";

   .check-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }
</style>
