<script>
   import {getContext} from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatMessageDice.svelte';
   import CastingCheckChatHeader from '~/check/types/casting-check/chat-message/CastingCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';
   import ChatHealingButton from '~/document/types/chat-message/components/buttons/ChatMessageHealingButton.svelte';
   import CheckChatScalingAspects from '~/check/chat-message/CheckChatScalingAspects.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CheckChatMesssages from '~/check/chat-message/CheckChatMessages.svelte';
   import ItemCheckChatItemTraits from '~/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte';
   import CastingCheckChatMessageResistanceCheckButtons
      from '~/check/types/casting-check/chat-message/CastingCheckChatMessageResistanceCheckButtons.svelte';

   /** @type object Reference to the Document store. */
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
         $document.flags.titan.parameters.reflexesCheck ||
         $document.flags.titan.parameters.resilienceCheck ||
         $document.flags.titan.parameters.willpowerCheck
      }
         <div class="section tags">
            <CastingCheckChatMessageResistanceCheckButtons/>
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

         &:not(:first-child, .tags) {
            margin-top: var(--titan-padding-large);
         }
      }
   }
</style>
