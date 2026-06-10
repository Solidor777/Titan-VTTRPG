<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import ShieldStats from '~/document/types/item/types/shield/components/ShieldStats.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The item's chat-message system snapshot. */
   const item = document.data.system;
</script>

<ItemChatMessageShell {item}>
   <!--Shield stats (shared component; reads the snapshot through the message's document context)-->
   <div class="section">
      <ShieldStats/>
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
