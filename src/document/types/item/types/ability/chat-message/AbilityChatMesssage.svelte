<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatMessageItemChecks
      from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import AbilityChatStats from '~/document/types/item/types/ability/chat-message/AbilityChatStats.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The titan flags data for the item. */
   const item = $document.flags.titan;
</script>

<ItemChatMessageShell {item}>
   <!--Checks-->
   {#if item.check.length > 0}
      <div class="section">
         <ItemChatMessageItemChecks {item}/>
      </div>
   {/if}

   <!--Description-->
   {#if item.description && item.description !== '' && item.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.description}/>
      </div>
   {/if}

   <!--Stats-->
   <div class="section">
      <AbilityChatStats {item}/>
   </div>
</ItemChatMessageShell>

<style lang="scss">
   .section {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      &:not(.rich-text) {
         padding-bottom: var(--titan-spacing-large);
      }

      &:last-child {
         padding-bottom: var(--titan-spacing-standard);
      }

      &:not(:first-child) {
         @include border-top;
      }
   }
</style>
