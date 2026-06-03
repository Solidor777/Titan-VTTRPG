<script>
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} EquipmentChatStatsProps
    * @property {object} [item] - The titan flags data for the item.
    */

   /** @type {EquipmentChatStatsProps} */
   const { item = void 0 } = $props();
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag rarity={item.system.rarity}/>
   </div>

   <!--Value-->
   {#if item.system.value}
      <div class="stat">
         <ValueTag value={item.system.value}/>
      </div>
   {/if}

   <!--Custom Traits-->
   {#each item.system.customTrait as trait}
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
