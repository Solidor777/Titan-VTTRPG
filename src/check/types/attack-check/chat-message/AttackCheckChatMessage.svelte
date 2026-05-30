<script>
   import { getContext } from 'svelte';
   import CheckChatDiceContainer from '~/check/chat-message/CheckChatMessageDice.svelte';
   import CheckChatResults from '~/check/chat-message/CheckChatResults.svelte';
   import AttackCheckChatHeader from '~/check/types/attack-check/chat-message/AttackCheckChatHeader.svelte';
   import AttackCheckChatStats from '~/check/types/attack-check/chat-message/AttackCheckChatStats.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CheckChatMessages from '~/check/chat-message/CheckChatMessages.svelte';
   import ChatRendButtons from '~/document/types/chat-message/components/buttons/ChatMessageRendButtons.svelte';
   import AttackCheckChatDamageButtons
      from '~/check/types/attack-check/chat-message/AttackCheckChatDamageButtons.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttackCheckChatHeader/>
   </div>

   <!--Attack Notes-->
   {#if document.data.flags.titan.parameters.attackNotes !==
   '' &&
   document.data.flags.titan.parameters.attackNotes !==
   '<p></p>'}
      <div class="section rich-text">
         <RichText value={document.data.flags.titan.parameters.attackNotes}/>
      </div>
   {/if}

   <!--Chat Messages-->
   {#if document.data.flags.titan.message}
      <div class="section">
         <CheckChatMessages/>
      </div>
   {/if}

   <!--Stats-->
   <div class="section tags">
      <AttackCheckChatStats/>
   </div>

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer/>
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults/>
   </div>

   {#if document.data.flags.titan.results.succeeded}
      <!--Damage Buttons-->
      <!-- svelte-ignore missing-declaration -->
      {#if document.data.flags.titan.results.damage && game.user.isGM}
         <div class="section">
            <AttackCheckChatDamageButtons
               damage={document.data.flags.titan.results.damage}
               ineffective={document.data.flags.titan.parameters.ineffective ??
                  false}
               penetrating={document.data.flags.titan.parameters.penetrating ??
                  false}
               cleave={document.data.flags.titan.parameters.cleave
                  ? document.data.flags.titan.results.criticalSuccesses
                  : 0}
            />
         </div>
      {/if}

      <!--Critical Success Effects-->
      {#if document.data.flags.titan.results.criticalSuccesses && document.data.flags.titan.parameters.rend}
         <div class="section">
            <ChatRendButtons
               rend={document.data.flags.titan.results.criticalSuccesses}
               magical={document.data.flags.titan.parameters.magical ?? false}
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

         &:not(:first-child, .tags, .rich-text, .rich-text + section
            ) {
            @include margin-top-large;
         }
      }
   }
</style>
