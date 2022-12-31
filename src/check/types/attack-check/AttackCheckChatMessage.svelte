<script>
   import { getContext } from "svelte";
   import CheckChatDiceContainer from "~/check/chat-message/CheckChatDiceContainer.svelte";
   import CheckChatResults from "~/check/chat-message/CheckChatResults.svelte";
   import CheckChatDamageButtons from "~/check/chat-message/CheckChatDamageButtons.svelte";
   import CheckChatHealingButton from "~/check/chat-message/CheckChatHealingButton.svelte";
   import CheckChatOpposedCheckButton from "~/check/chat-message/CheckChatOpposedCheckButton.svelte";
   import CheckChatResistanceCheckButtons from "~/check/chat-message/CheckChatResistanceCheckButtons.svelte";
   import ChatRichText from "~/helpers/svelte-components/ChatRichText.svelte";
   import AttackCheckChatHeader from "./AttackCheckChatHeader.svelte";
   import AttackCheckStats from "./AttackCheckStats.svelte";
   import RichText from "../../../helpers/svelte-components/RichText.svelte";

   // Document reference
   const document = getContext("DocumentStore");
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttackCheckChatHeader />
   </div>

   <!--Stats-->
   <div class="section tags">
      <AttackCheckStats />
   </div>

   <!--Attack Notes-->
   {#if $document.flags.titan.chatContext.parameters.attackNotes !== "" && $document.flags.titan.chatContext.parameters.attackNotes !== "<p></p>"}
      <div class="section rich-text">
         <RichText text={$document.flags.titan.chatContext.parameters.attackNotes} />
      </div>
   {/if}

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer />
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults />
   </div>

   {#if $document.flags.titan.chatContext.results.succeeded}
      <!--Damage Buttons-->
      <!-- svelte-ignore missing-declaration -->
      {#if $document.flags.titan.chatContext.results.damage && game.user.isGM}
         <div class="section">
            <CheckChatDamageButtons />
         </div>
      {/if}

      <!--Healing Button-->
      <!-- svelte-ignore missing-declaration -->
      {#if $document.flags.titan.chatContext.results.healing && game.user.isGM}
         <div class="section">
            <CheckChatHealingButton />
         </div>
      {/if}

      <!--Opposed Check Buttons-->
      {#if $document.flags.titan.chatContext.results.succeeded && $document.flags.titan.chatContext.parameters.opposedCheck}
         <div class="section">
            <CheckChatOpposedCheckButton />
         </div>
      {/if}

      <!--Resistance Check Buttons-->
      {#if $document.flags.titan.chatContext.results.reflexesCheck || $document.flags.titan.chatContext.results.resilienceCheck || $document.flags.titan.chatContext.results.willpowerCheck}
         <div class="section tags">
            <CheckChatResistanceCheckButtons />
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .check-chat-message {
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;
      width: 100%;

      .section {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child):not(.tags):not(.rich-text):not(.rich-text + section) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
