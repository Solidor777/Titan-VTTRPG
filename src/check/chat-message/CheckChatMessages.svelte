<script>
   import {getContext} from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="messages">
   {#each $document.flags.titan.message as message}
      <div class="section">
         <RichText value={message}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .messages {
      @include flex-column;
      @include flex-group-top-left;

      width: 100%;
   }

   .section {
      @include border;
      @include panel-1;
      @include flex-row;

      padding: var(--titan-padding-standard);

      &:not(:first-child) {
         margin-top: var(--titan-padding-large);
      }
   }
</style>
