<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} SpellChatStatsProps
    * @property {object} [item] - The titan flags data for the item.
    */

   /** @type {SpellChatStatsProps} */
   const { item = void 0 } = $props();
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag rarity={item.rarity}/>
   </div>

   <!--Tradition-->
   <div class="stat">
      <StatTag
         label={localize('tradition')}
         value={item.tradition}
      />
   </div>

   <!--XP Cost-->
   {#if item.xpCost}
      <div class="stat">
         <StatTag label={localize('xpCost')} value={item.xpCost}/>
      </div>
   {/if}

   <!--Custom Traits-->
   {#each item.customTrait as trait}
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
