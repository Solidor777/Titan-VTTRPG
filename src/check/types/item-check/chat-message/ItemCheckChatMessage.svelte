<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatDiceContainer.svelte';
   import ItemCheckChatHeader from '~/check/types/item-check/chat-message/ItemCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';
   import ChatHealingButton from '~/document/types/chat-message/components/buttons/ChatMessageHealingButton.svelte';
   import ChatAttributeCheckButton
      from '~/document/types/chat-message/components/buttons/ChatMessageOpposedAttributeCheckButton.svelte';
   import ChatResistanceCheckButtons
      from '~/document/types/chat-message/components/buttons/ChatMessageResistanceCheckButtons.svelte';
   import ItemCheckChatItemTraits from '~/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte';
   import CheckChatMesssages from '~/check/chat-message/CheckChatMessages.svelte';

   // Document reference
   const document = getContext('document');
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <ItemCheckChatHeader/>
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

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer/>
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults/>
   </div>

   <!--If succeeded-->
   {#if $document.flags.titan.results.succeeded}
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

      <!--Opposed Check Buttons-->
      {#if $document.flags.titan.parameters.opposedCheck}
         <div class="section">
            <ChatAttributeCheckButton
               attribute={$document.flags.titan.parameters.opposedCheck
                  .attribute}
               skill={$document.flags.titan.parameters.opposedCheck.skill}
               difficulty={$document.flags.titan.parameters.opposedCheck
                  .difficulty}
               complexity={$document.flags.titan.results.extraSuccesses + 1}
               damageToReduce={$document.flags.titan.parameters.isDamage &&
               $document.flags.titan.parameters.damageReducedBy ===
                  'opposedCheck'
                  ? $document.flags.titan.results.damage
                  : 0}
            />
         </div>
      {/if}

      <!--Resistance Check Buttons-->
      {#if $document.flags.titan.results.reflexesCheck || $document.flags.titan.results.resilienceCheck || $document.flags.titan.results.willpowerCheck}
         <div class="section tags">
            <ChatResistanceCheckButtons
               reflexes={$document.flags.titan.results.reflexesCheck}
               resilience={$document.flags.titan.results.resilienceCheck}
               willpower={$document.flags.titan.results.willpowerCheck}
               difficulty={4}
               complexity={$document.flags.titan.results.extraSuccesses + 1}
               damageToReduce={$document.flags.titan.parameters.isDamage &&
               $document.flags.titan.parameters.damageReducedBy ===
                  'resistanceCheck'
                  ? $document.flags.titan.results.damage
                  : 0}
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

         &:not(:first-child):not(.tags) {
            margin-top: var(--padding-large);
         }
      }
   }
</style>
