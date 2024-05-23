<script>
   import {getContext} from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatMessageDice.svelte';
   import AttributeCheckChatHeader from '~/check/types/attribute-check/chat-message/AttributeCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import CheckChatMessages from '~/check/chat-message/CheckChatMessages.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';

   // Document reference
   const document = getContext('document');
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttributeCheckChatHeader/>
   </div>

   <!--Chat Messages-->
   {#if $document.flags.titan.message}
      <div class="section">
         <CheckChatMessages/>
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

   <!--Damage Buttons-->
   <!-- svelte-ignore missing-declaration -->
   {#if $document.flags.titan.results.damageTaken && game.user.isGM}
      <div class="section">
         <ChatDamageButtons
            damage={$document.flags.titan.results.damageTaken}
         />
      </div>
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
            margin-top: var(--padding-large);
         }
      }
   }
</style>
