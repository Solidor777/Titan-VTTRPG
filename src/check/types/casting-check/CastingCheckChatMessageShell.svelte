<script>
   import { getContext } from "svelte";
   import CheckChatDiceContainer from "~/check/chat-message/CheckChatDiceContainer.svelte";
   import CastingCheckChatHeader from "./CastingCheckChatHeader.svelte";
   import CheckChatResults from "~/check/chat-message/CheckChatResults.svelte";
   import CheckChatDamageButtons from "~/check/chat-message/CheckChatDamageButtons.svelte";
   import CheckChatHealingButton from "~/check/chat-message/CheckChatHealingButton.svelte";
   import CheckChatResistanceCheckButtons from "~/check/chat-message/CheckChatResistanceCheckButtons.svelte";
   import CheckChatScalingAspects from "~/check/chat-message/CheckChatScalingAspects.svelte";
   import ChatRichText from "~/helpers/svelte-components/ChatRichText.svelte";

   // Document reference
   const document = getContext("DocumentStore");

   // Scaling aspects list
   $: scalingAspect =
      $document.flags.titan.chatContext.results.scalingAspect &&
      $document.flags.titan.chatContext.results.scalingAspect.length > 0 &&
      $document.flags.titan.chatContext.results.extraSuccesses &&
      $document.constructor.getSpeakerActor($document.speaker)?.isOwner;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <CastingCheckChatHeader />
   </div>

   <!--Casting Notes-->
   {#if $document.flags.titan.chatContext.parameters.castingNotes !== "" && $document.flags.titan.chatContext.parameters.castingNotes !== "<p></p>"}
      <div class="section rich-text">
         <ChatRichText text={$document.flags.titan.chatContext.parameters.castingNotes} />
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
      <!--Scaling Aspects-->
      {#if scalingAspect}
         <div class="section">
            <CheckChatScalingAspects />
         </div>
      {/if}

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
      width: 100%;

      .section {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child):not(.tags) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
