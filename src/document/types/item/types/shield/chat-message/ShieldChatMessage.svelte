<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import ShieldChatStats from '~/document/types/item/types/shield/chat-message/ShieldChatStats.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The item's chat-message system snapshot. */
   const item = document.data.system;
</script>

<ItemChatMessageShell {item}>
   <!--Shield stats-->
   <div class="section">
      <ShieldChatStats {item}/>
   </div>

   <!--Description-->
   {#if item.description !== '' && item.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.description}/>
      </div>
   {/if}

   <!--Checks-->
   {#if item.check.length > 0}
      <div class="section">
         <ItemChatChecks {item}/>
      </div>
   {/if}
</ItemChatMessageShell>

<style lang="scss">
   .section {
      @include flex-column;
      @include flex-group-top;
      @include padding-top-large;

      width: 100%;

      &:not(.rich-text) {
         @include padding-bottom-large;
      }

      &:last-child {
         @include padding-bottom-standard;
      }

      &:not(:first-child) {
         @include border-top;
      }
   }
</style>
