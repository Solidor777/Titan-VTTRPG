<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatMessageDice.svelte';
   import CastingCheckChatHeader from '~/check/types/casting-check/chat-message/CastingCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';
   import ChatHealingButton from '~/document/types/chat-message/components/buttons/ChatMessageHealingButton.svelte';
   import CheckChatScalingAspects from '~/check/chat-message/CheckChatScalingAspects.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CheckChatMessages from '~/check/chat-message/CheckChatMessages.svelte';
   import ItemCheckChatItemTraits from '~/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte';
   import CastingCheckChatMessageResistanceCheckButtons
      from '~/check/types/casting-check/chat-message/CastingCheckChatMessageResistanceCheckButtons.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} Whether to show the scaling aspect controls. */
   const scalingAspect = $derived(
      document.data.system.results.scalingAspect &&
      document.data.system.results.scalingAspect.length > 0 &&
      document.data.system.results.extraSuccesses &&
      document.data.constructor.getSpeakerActor(document.data.speaker)?.isOwner,
   );
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <CastingCheckChatHeader/>
   </div>

   <!--Chat Messages-->
   {#if document.data.system.message.length}
      <div class="section">
         <CheckChatMessages/>
      </div>
   {/if}

   <!--Item Traits-->
   {#if document.data.system.parameters.itemTrait}
      <div class="section tags">
         <ItemCheckChatItemTraits/>
      </div>
   {/if}

   <!--Description-->
   {#if document.data.system.results.succeeded &&
   document.data.system.parameters.itemDescription !==
   '' &&
   document.data.system.parameters.itemDescription !==
   '<p></p>'}
      <div class="section rich-text">
         <RichText value={document.data.system.parameters.itemDescription}/>
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

   {#if document.data.system.results.succeeded}
      <!--Scaling Aspects-->
      {#if scalingAspect}
         <div class="section">
            <CheckChatScalingAspects/>
         </div>
      {/if}

      <!--Damage Buttons-->
      {#if document.data.system.results.damage && game.user.isGM}
         <div class="section">
            <ChatDamageButtons damage={document.data.system.results.damage}/>
         </div>
      {/if}

      <!--Healing Button-->
      {#if document.data.system.results.healing && game.user.isGM}
         <div class="section">
            <ChatHealingButton
               healing={document.data.system.results.healing}
            />
         </div>
      {/if}

      <!--Resistance Check Buttons-->
      {#if
         document.data.system.parameters.reflexesCheck ||
         document.data.system.parameters.resilienceCheck ||
         document.data.system.parameters.willpowerCheck
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
            @include margin-top-large;
         }
      }
   }
</style>
