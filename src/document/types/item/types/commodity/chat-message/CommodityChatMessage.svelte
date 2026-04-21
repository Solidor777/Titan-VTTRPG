<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The titan flags data for the item. */
   const item = $document.flags.titan;
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

   <!--Footer-->
   <div class="section small-text tags">
      <!--Rarity-->
      <div class="tag">
         <RarityTag rarity={item.system.rarity}/>
      </div>

      <!--Value-->
      {#if item.system.value}
         <div class="tag">
            <ValueTag value={item.system.value}/>
         </div>
      {/if}

      <!--Quantity-->
      <div class="tag">
         <StatTag
            label={localize('quantity')}
            value={item.system.quantity}
         />
      </div>

      <!--Custom Traits-->
      {#each item.system.customTrait as trait}
         <div class="tag">
            <Tag tooltip={trait.description}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</ItemChatMessageShell>

<style lang="scss">
   .section {
      width: 100%;

      &:not(.rich-text) {
         padding-bottom: var(--titan-spacing-large);

         &:not(.tags) {
            padding-top: var(--titan-spacing-large);
         }
      }

      &:last-child {
         padding-bottom: var(--titan-spacing-standard);
      }

      &:not(:first-child) {
         @include border-top;
      }

      &.tags {
         @include tag-container;
      }

      &:not(.tags) {
         @include flex-column;
         @include flex-group-top;
      }

      &.small-text {
         @include font-size-small;
      }
   }
</style>
