<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import WeaponChatAttacks from '~/document/types/item/types/weapon/chat-message/WeaponChatAttacks.svelte';
   import WeaponChatStats from '~/document/types/item/types/weapon/chat-message/WeaponChatStats.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The item's chat-message system snapshot. */
   const item = document.data.system;
</script>

<ItemChatMessageShell {item}>
   <!--Attacks-->
   <div class="section">
      <WeaponChatAttacks/>
   </div>

   <!--Attack Notes-->
   {#if item.attackNotes !== '' && item.attackNotes !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.attackNotes}/>
      </div>
   {/if}

   <!--Description-->
   {#if item.description && item.description !== '' && item.description !== '<p></p>'}
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

   <!--Stats-->
   <div class="section">
      <WeaponChatStats {item}/>
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
