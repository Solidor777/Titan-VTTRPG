<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} EffectChatStatsProps
    * @property {object} [item] - The titan flags data for the item.
    */

   /** @type {EffectChatStatsProps} */
   const { item = void 0 } = $props();
</script>

<div class="stats">
   <!--Duration-->
   <div class="stat">
      <DurationTag
         remaining={item.duration.remaining}
         type={item.duration.type}
      />
   </div>

   <!--Expired-->
   {#if item.duration.type !== 'permanent' && item.duration.remaining <= 0}
      <div class="stat">
         <Tag>{localize('expired')}</Tag>
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
