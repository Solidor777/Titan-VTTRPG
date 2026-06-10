<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded spell or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The spell's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {string} The spell's tradition, read reactively through the document bridge. */
   const tradition = $derived(document.data?.system.tradition);

   /** @type {number} The spell's XP cost, read reactively through the document bridge. */
   const xpCost = $derived(document.data?.system.xpCost);

   /** @type {Array<object>} The spell's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Tradition-->
   <div class="stat">
      <StatTag
         label={localize('tradition')}
         value={tradition}
      />
   </div>

   <!--XP Cost-->
   {#if xpCost}
      <div class="stat">
         <StatTag
            label={localize('xpCost')}
            value={xpCost}
         />
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
