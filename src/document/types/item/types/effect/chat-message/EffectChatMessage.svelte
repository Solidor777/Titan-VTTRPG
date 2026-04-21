<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
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
   <div class="section tags small-text">
      <!--Duration-->
      <div class="tag">
         <DurationTag
            remaining={item.system.duration.remaining}
            type={item.system.duration.type}
         />
      </div>

      <!--Expired-->
      {#if item.system.duration.type !== 'permanent' && item.system.duration.remaining <= 0}
         <div class="tag">
            <Tag>{localize('expired')}</Tag>
         </div>
      {/if}

      <!--Traits-->
      {#if item.system.customTrait.length > 0}
         {#each item.system.customTrait as trait}
            <div class="tag">
               <Tag tooltip={trait.description}>
                  {trait.name}
               </Tag>
            </div>
         {/each}
      {/if}
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
