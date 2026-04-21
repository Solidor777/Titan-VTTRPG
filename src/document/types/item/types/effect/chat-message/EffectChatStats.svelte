<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The titan flags data for the item. */
   export let item = void 0;
</script>

<div class="stats">
   <!--Duration-->
   <div class="stat">
      <DurationTag
         remaining={item.system.duration.remaining}
         type={item.system.duration.type}
      />
   </div>

   <!--Expired-->
   {#if item.system.duration.type !== 'permanent' && item.system.duration.remaining <= 0}
      <div class="stat">
         <Tag>{localize('expired')}</Tag>
      </div>
   {/if}

   <!--Custom Traits-->
   {#each item.system.customTrait as trait}
      <div class="stat">
         <Tag tooltip={trait.description}>
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
