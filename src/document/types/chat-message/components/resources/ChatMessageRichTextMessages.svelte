<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');
</script>

<div class="messages">
   {#each $document.flags.titan.message as message}
      <div class="message">
         <RichText text="{message}"/>
      </div>
   {/each}
</div>

<style lang="scss">
   .messages {
      @include flex-column;
      @include flex-group-center;

      width: 100%;

      .message {
         @include flex-row;
         @include flex-group-left;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
         }
      }
   }
</style>
