<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatMessageDice.svelte';
   import ItemCheckChatHeader from '~/check/types/item-check/chat-message/ItemCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';
   import ChatHealingButton from '~/document/types/chat-message/components/buttons/ChatMessageHealingButton.svelte';
   import ChatAttributeCheckButton
      from '~/document/types/chat-message/components/buttons/ChatMessageOpposedAttributeCheckButton.svelte';
   import ItemCheckChatItemTraits from '~/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte';
   import CheckChatMessages from '~/check/chat-message/CheckChatMessages.svelte';
   import ResistanceCheckButton from '~/helpers/svelte-components/button/ResistanceCheckButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <ItemCheckChatHeader/>
   </div>

   <!--Chat Messages-->
   {#if document.data.flags.titan.message}
      <div class="section">
         <CheckChatMessages/>
      </div>
   {/if}

   <!--Item Traits-->
   {#if document.data.flags.titan.parameters.itemTrait}
      <div class="section tags">
         <ItemCheckChatItemTraits/>
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

   <!--If succeeded-->
   {#if document.data.flags.titan.results.succeeded}
      <!--Damage Buttons-->
      <!-- svelte-ignore missing-declaration -->
      {#if document.data.flags.titan.results.damage && game.user.isGM}
         <div class="section">
            <ChatDamageButtons damage={document.data.flags.titan.results.damage}/>
         </div>
      {/if}

      <!--Healing Button-->
      <!-- svelte-ignore missing-declaration -->
      {#if document.data.flags.titan.results.healing && game.user.isGM}
         <div class="section">
            <ChatHealingButton
               healing={document.data.flags.titan.results.healing}
            />
         </div>
      {/if}

      <!--Opposed Check Buttons-->
      {#if document.data.flags.titan.parameters.opposedCheck}
         <div class="section">
            <ChatAttributeCheckButton
               attribute={document.data.flags.titan.parameters.opposedCheck
                  .attribute}
               skill={document.data.flags.titan.parameters.opposedCheck.skill}
               difficulty={document.data.flags.titan.parameters.opposedCheck
                  .difficulty}
               complexity={document.data.flags.titan.results.extraSuccesses + 1}
               damageToReduce={document.data.flags.titan.parameters.isDamage &&
               document.data.flags.titan.parameters.damageReducedBy ===
                  'opposedCheck'
                  ? document.data.flags.titan.results.damage
                  : 0}
            />
         </div>
      {/if}

      <!--Resistance Check Button-->
      {#if document.data.flags.titan.parameters.resistanceCheck !== 'none'}
         <div class="section">
            <ResistanceCheckButton
               resistance={document.data.flags.titan.parameters.resistanceCheck}
               complexity={document.data.flags.titan.results.extraSuccesses + 1}
               damageToReduce={
                  document.data.flags.titan.parameters.damageReducedBy === 'resistanceCheck' ?
                  document.data.flags.titan.results.damage :
                  0
               }
            />
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   .check-chat-message {
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;

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
