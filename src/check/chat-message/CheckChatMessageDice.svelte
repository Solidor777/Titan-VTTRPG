<script>
   import {getContext} from 'svelte';
   import CheckChatMessageDie from '~/check/chat-message/CheckChatMessageDie.svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type CheckDie[] Array of processed dice from the Check. */
   let dice = $document.flags.titan.results.dice;

   // Update the dice in response to changes
   $: {
      if ($document) {
         dice = $document.flags.titan.results.dice;
      }
   }
</script>

<div class="container">
   {#each dice as die}
      <div class="dice">
         <CheckChatMessageDie {die}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .container {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      flex-wrap: wrap;

      .dice {
         @include tag-margin;
      }
   }
</style>
