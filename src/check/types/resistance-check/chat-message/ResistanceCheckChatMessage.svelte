<script>
   import {getContext} from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatMessageDice.svelte';
   import ResistanceCheckChatHeader from '~/check/types/resistance-check/chat-message/ResistanceCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import CheckChatMesssages from '~/check/chat-message/CheckChatMessages.svelte';
   import ChatDamageButtons from '~/document/types/chat-message/components/buttons/ChatMessageDamageButtons.svelte';

   // Document reference
   const document = getContext('document');
   const check = $document.flags.titan;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <ResistanceCheckChatHeader {check}/>
   </div>

   <!--Chat Messages-->
   {#if $document.flags.titan.message}
      <div class="section">
         <CheckChatMesssages/>
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
