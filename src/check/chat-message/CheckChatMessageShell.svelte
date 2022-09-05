<script>
   import { getContext } from "svelte";
   import CheckAspects from "./CheckAspects.svelte";

   import CheckChatDiceContainer from "./CheckChatDiceContainer.svelte";
   import CheckChatLabel from "./CheckChatLabel.svelte";
   import CheckChatResults from "./CheckChatResults.svelte";
   import CheckDamageButtons from "./CheckDamageButtons.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="check-chat-message">
   <CheckChatLabel />
   <CheckChatDiceContainer />
   <CheckChatResults />

   {#if chatContext.results.extraSuccesses !== undefined && chatContext.parameters.aspects}
      <CheckAspects />
   {/if}
   <!-- svelte-ignore missing-declaration -->
   {#if chatContext.results.damage && game.user.isGM}
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
