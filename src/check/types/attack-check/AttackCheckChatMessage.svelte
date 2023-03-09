<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatDiceContainer.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import AttackCheckChatHeader from './AttackCheckChatHeader.svelte';
   import AttackCheckChatStats from './AttackCheckChatStats.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CheckChatMesssages from '~/check/chat-message/CheckChatMesssages.svelte';
   import ChatRendButtons from '~/chat-message/ChatRendButtons.svelte';
   import AttackCheckChatDamageButtons from '~/check/types/attack-check/AttackCheckChatDamageButtons.svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttackCheckChatHeader />
   </div>

   <!--Attack Notes-->
   {#if $document.flags.titan.parameters.attackNotes !== '' && $document.flags.titan.parameters.attackNotes !== '<p></p>'}
      <div class="section rich-text">
         <RichText text={$document.flags.titan.parameters.attackNotes} />
      </div>
   {/if}

   <!--Chat Messages-->
   {#if $document.flags.titan.message}
      <div class="section">
         <CheckChatMesssages />
      </div>
   {/if}

   <!--Stats-->
   <div class="section tags">
      <AttackCheckChatStats />
   </div>

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer />
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults />
   </div>

   {#if $document.flags.titan.results.succeeded}
      <!--Damage Buttons-->
      <!-- svelte-ignore missing-declaration -->
      {#if $document.flags.titan.results.damage && game.user.isGM}
         <div class="section">
            <AttackCheckChatDamageButtons
               damage={$document.flags.titan.results.damage}
               ineffective={$document.flags.titan.parameters.ineffective ??
                  false}
               penetrating={$document.flags.titan.parameters.penetrating ??
                  false}
               cleave={$document.flags.titan.parameters.rend
                  ? $document.flags.titan.results.criticalSuccesses
                  : 0}
            />
         </div>
      {/if}

      <!--Critical Success Effects-->
      {#if $document.flags.titan.results.criticalSuccesses && $document.flags.titan.parameters.rend}
         <div class="section">
            <ChatRendButtons
               rend={$document.flags.titan.results.criticalSuccesses}
               magical={$document.flags.titan.parameters.magical ?? false}
            />
         </div>
      {/if}
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

         &:not(:first-child):not(.tags):not(.rich-text):not(
               .rich-text + section
            ) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
