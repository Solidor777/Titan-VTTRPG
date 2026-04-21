<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import ArmorChatStats from '~/document/types/item/types/armor/chat-message/ArmorChatStats.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The titan flags data for the item. */
   const item = $document.flags.titan;
</script>

<ItemChatMessageShell {item}>
   <!--Armor stats-->
   <div class="section">
      <ArmorChatStats {item}/>
   </div>

   <!--Description-->
   {#if item.system.description !== '' && item.system.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
      </div>
   {/if}

   <!--Checks-->
   {#if item.system.check.length > 0}
      <div class="section">
         <ItemChatChecks {item}/>
      </div>
   {/if}
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
