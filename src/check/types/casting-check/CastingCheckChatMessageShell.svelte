<script>
   import { getContext } from "svelte";
   import CheckChatDiceContainer from "~/check/chat-message/CheckChatDiceContainer.svelte";
   import CastingCheckChatHeader from "./CastingCheckChatHeader.svelte";
   import CheckChatResults from "~/check/chat-message/CheckChatResults.svelte";
   import CheckChatDamageButtons from "~/check/chat-message/CheckChatDamageButtons.svelte";
   import CheckChatHealingButton from "~/check/chat-message/CheckChatHealingButton.svelte";
   import CheckChatResistanceCheckButtons from "~/check/chat-message/CheckChatResistanceCheckButtons.svelte";
   import CheckChatScalingAspects from "~/check/chat-message/CheckChatScalingAspects.svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const check = $document.flags.titan.chatContext;

   // Whether this user is the owner
   $: isOwner = $document.constructor.getSpeakerActor($document.speaker)?.isOwner;

   // Scaling aspects list
   $: scalingAspects = $document.flags.titan.chatContext.parameters.aspect
      ? $document.flags.titan.chatContext.parameters.aspect.filter((aspect) => {
           return aspect.scaling;
        })
      : false;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <CastingCheckChatHeader {check} />
   </div>

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer dice={check.results.dice} />
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults results={check.results} />
   </div>

   <!--Scaling Aspects-->
   {#if isOwner && scalingAspects && scalingAspects.length > 0 && $document.flags.titan.chatContext.results.extraSuccesses !== undefined}
      <div class="section">
         <CheckChatScalingAspects bind:scalingAspects />
      </div>
   {/if}

   <!--Damage Buttons-->
   <!-- svelte-ignore missing-declaration -->
   {#if check.results.damage !== undefined && game.user.isGM}
      <div class="section">
         <CheckChatDamageButtons results={check.results} />
      </div>
   {/if}

   <!--Healing Button-->
   <!-- svelte-ignore missing-declaration -->
   {#if check.results.healing !== undefined && game.user.isGM}
      <div class="section">
         <CheckChatHealingButton results={check.results} />
      </div>
   {/if}

   <!--Resistance Check Buttons-->
   {#if check.results.reflexesCheck || check.results.resilienceCheck || check.results.willpowerCheck}
      <div class="section tags">
         <CheckChatResistanceCheckButtons results={check.results} />
      </div>
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
