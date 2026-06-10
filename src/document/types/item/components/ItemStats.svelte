<script>
   import { getContext } from 'svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded item or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The item's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {number} The item's gp value, read reactively through the document bridge. */
   const value = $derived(document.data?.system.value);

   /** @type {Array<object>} The item's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Value-->
   {#if value}
      <div class="stat">
         <ValueTag {value}/>
      </div>
   {/if}

   <!--Custom Traits-->
   {#each customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
