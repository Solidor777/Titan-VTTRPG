<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import EquipmentChatStats
      from '~/document/types/item/types/equipment/chat-message/EquipmentChatStats.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The titan flags data for the item. */
   const item = document.data.flags.titan;
</script>

<ItemChatMessageShell {item}>
   <!--Checks-->
   {#if item.system.check.length > 0}
      <div class="section">
         <ItemChatChecks {item}/>
      </div>
   {/if}

   <!--Description-->
   {#if item.system.description !== '' && item.system.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
      </div>
   {/if}

   <!--Stats-->
   <div class="section">
      <EquipmentChatStats {item}/>
   </div>
</ItemChatMessageShell>

<style lang="scss">
   .section {
      @include flex-column;
      @include flex-group-top;

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
