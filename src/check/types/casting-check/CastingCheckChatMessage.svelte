<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatDiceContainer.svelte';
   import CastingCheckChatHeader from './CastingCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import ChatDamageButtons from '~/chat-message/ChatDamageButtons.svelte';
   import ChatHealingButton from '~/chat-message/ChatHealingButton.svelte';
   import ChatResistanceCheckButtons from '~/chat-message/ChatResistanceCheckButtons.svelte';
   import CheckChatScalingAspects from '~/check/chat-message/CheckChatScalingAspects.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';

   // Document reference
   const document = getContext('DocumentStore');

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

   <!--Description-->
   {#if $document.flags.titan.chatContext.results.succeeded && $document.flags.titan.chatContext.parameters.description !== '' && $document.flags.titan.chatContext.parameters.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText
            text={$document.flags.titan.chatContext.parameters.description} />
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
            <ChatDamageButtons
               damage={$document.flags.titan.chatContext.results.damage} />
         </div>
      {/if}

      <!--Healing Button-->
      <!-- svelte-ignore missing-declaration -->
      {#if $document.flags.titan.chatContext.results.healing && game.user.isGM}
         <div class="section">
            <ChatHealingButton
               healing={$document.flags.titan.chatContext.results.healing} />
         </div>
      {/if}

      <!--Resistance Check Buttons-->
      {#if $document.flags.titan.chatContext.results.reflexesCheck || $document.flags.titan.chatContext.results.resilienceCheck || $document.flags.titan.chatContext.results.willpowerCheck}
         <div class="section tags">
            <ChatResistanceCheckButtons
               reflexes={$document.flags.titan.chatContext.results
                  .reflexesCheck}
               resilience={$document.flags.titan.chatContext.results
                  .resilienceCheck}
               willpower={$document.flags.titan.chatContext.results
                  .willpowerCheck}
               difficulty={4}
               complexity={$document.flags.titan.chatContext.results
                  .extraSuccesses + 1} />
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   @import '../../../styles/Mixins.scss';

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
