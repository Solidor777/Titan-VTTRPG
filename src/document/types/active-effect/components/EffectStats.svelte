<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded effect or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The effect's duration type, read reactively through the document bridge. */
   const durationType = $derived(document.data?.system.duration.type);

   /** @type {number} The effect's remaining duration, read reactively through the document bridge. */
   const durationRemaining = $derived(document.data?.system.duration.remaining);

   /**
    * @type {boolean} Whether the effect is expired, computed from the duration (the chat snapshot
    * carries no derived isExpired; this is TitanActiveEffectDataModel#isExpired's exact condition).
    */
   const isExpired = $derived(durationType !== 'permanent' && durationRemaining <= 0);

   /** @type {Array<object>} The effect's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Duration-->
   <div class="stat">
      <DurationTag
         remaining={durationRemaining}
         testId={'effect-row-duration'}
         type={durationType}
      />
   </div>

   <!--Expired-->
   {#if isExpired}
      <div class="stat">
         <Tag>{localize('expired')}</Tag>
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
