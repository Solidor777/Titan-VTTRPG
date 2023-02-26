<script>
   import { getContext } from 'svelte';
   import RichText from '../../helpers/svelte-components/RichText.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   console.log($document.flags.titan.message);
</script>

<div class="messages">
   {#each $document.flags.titan.message as message}
      <div class="message">
         <RichText text={message} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .messages {
      @include flex-column;
      @include flex-group-top-left;
      width: 100%;
   }
   .message {
      @include border;
      @include panel-1;
      @include flex-row;
      padding: 0.25rem;

      &:not(:first-child) {
         margin-top: 0.5rem;
      }
   }
</style>
