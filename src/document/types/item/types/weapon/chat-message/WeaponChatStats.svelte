<script>
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} WeaponChatStatsProps
    * @property {object} [item] - The titan flags data for the item.
    */

   /** @type {WeaponChatStatsProps} */
   const { item = void 0 } = $props();
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag rarity={item.rarity}/>
   </div>

   <!--Value-->
   {#if item.value}
      <div class="stat">
         <ValueTag value={item.value}/>
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
