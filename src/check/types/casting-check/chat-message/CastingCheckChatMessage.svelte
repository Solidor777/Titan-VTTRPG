<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatDiceContainer.svelte';
   import CastingCheckChatHeader from '~/check/types/casting-check/chat-message/CastingCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';
   import ChatHealingButton from '~/document/types/chat-message/components/buttons/ChatMessageHealingButton.svelte';
   import ChatResistanceCheckButtons
      from '~/document/types/chat-message/components/buttons/ChatMessageResistanceCheckButtons.svelte';
   import CheckChatScalingAspects from '~/check/chat-message/CheckChatScalingAspects.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CheckChatMesssages from '~/check/chat-message/CheckChatMessages.svelte';
   import ItemCheckChatItemTraits from '~/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte';

   // Document reference
   const document = getContext('document');

   // Scaling aspects list
   $: scalingAspect =
      $document.flags.titan.results.scalingAspect &&
      $document.flags.titan.results.scalingAspect.length > 0 &&
      $document.flags.titan.results.extraSuccesses &&
      $document.constructor.getSpeakerActor($document.speaker)?.isOwner;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <CastingCheckChatHeader/>
   </div>

   <!--Chat Messages-->
   {#if $document.flags.titan.message}
      <div class="section">
         <CheckChatMesssages/>
      </div>
   {/if}

   <!--Item Traits-->
   {#if $document.flags.titan.parameters.itemTrait}
      <div class="section tags">
         <ItemCheckChatItemTraits/>
      </div>
   {/if}

   <!--Description-->
   {#if $document.flags.titan.results.succeeded && $document.flags.titan.parameters.itemDescription !== '' && $document.flags.titan.parameters.itemDescription !== '<p></p>'}
      <div class="section rich-text">
         <RichText text={$document.flags.titan.parameters.itemDescription}/>
      </div>
   {/if}

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer/>
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults/>
   </div>

   {#if $document.flags.titan.results.succeeded}
      <!--Scaling Aspects-->
      {#if scalingAspect}
         <div class="section">
            <CheckChatScalingAspects/>
         </div>
      {/if}

      <!--Damage Buttons-->
      <!-- svelte-ignore missing-declaration -->
      {#if $document.flags.titan.results.damage && game.user.isGM}
         <div class="section">
            <ChatDamageButtons damage={$document.flags.titan.results.damage}/>
         </div>
      {/if}

      <!--Healing Button-->
      <!-- svelte-ignore missing-declaration -->
      {#if $document.flags.titan.results.healing && game.user.isGM}
         <div class="section">
            <ChatHealingButton
               healing={$document.flags.titan.results.healing}
            />
         </div>
      {/if}

      <!--Resistance Check Buttons-->
      {#if
         $document.flags.titan.results.reflexesCheck ||
         $document.flags.titan.results.resilienceCheck ||
         $document.flags.titan.results.willpowerCheck
      }
         <div class="section tags">
            <ChatResistanceCheckButtons
               reflexes={$document.flags.titan.results.reflexesCheck}
               resilience={$document.flags.titan.results.resilienceCheck}
               willpower={$document.flags.titan.results.willpowerCheck}
               difficulty={4}
               complexity={$document.flags.titan.results.extraSuccesses + 1}
            />
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   .check-chat-message {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .section {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child):not(.tags) {
            margin-top: var(--padding-large);
         }
      }
   }
</style>
