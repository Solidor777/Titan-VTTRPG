<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatDiceContainer.svelte';
   import AttributeCheckChatHeader from './AttributeCheckChatHeader.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import CheckChatMesssages from '~/check/chat-message/CheckChatMesssages.svelte';
   import ChatDamageButtons from '~/chat-message/ChatDamageButtons.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   console.log($document.flags.titan.results.damageTaken);
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttributeCheckChatHeader />
   </div>

   <!--Chat Messages-->
   {#if $document.flags.titan.message}
      <div class="section">
         <CheckChatMesssages />
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
   @import '../../../styles/Mixins.scss';

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
            margin-top: 0.5rem;
         }
      }
   }
</style>
