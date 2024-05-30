<script>
   import SpellCustomAspectTag from '~/helpers/svelte-components/tag/SpellCustomAspectTag.svelte';
   import SpellStandardAspectTag from '~/helpers/svelte-components/tag/SpellStandardAspectTag.svelte';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';

   // Aspects list
   export let standardAspects = void 0;
   export let customAspects = void 0;

   /**
    * @param aspect
    */
   function getAspectSize(aspect) {
      let size = 0;

      if (aspect.scaling) {
         size += 1;
      }

      if (aspect.allOptions) {
         size += 1;
      } else if (aspect.option) {
         size += aspect.option.length;
      }

      if (aspect.resistanceCheck) {
         size += 2;
      }

      return size;
   }

   // Sort the aspects by size
   $: aspectSizeMap = standardAspects
      .map((aspect, idx) => {
         return {idx: idx, size: getAspectSize(aspect), standardAspect: true};
      })
      .concat(
         customAspects.map((aspect, idx) => {
            return {
               idx: idx,
               size: getAspectSize(aspect),
               standardAspect: false,
            };
         }),
      )
      .sort((a, b) => sortAscending(a.sort, b.sort));
</script>

<div class="aspects">
   {#each aspectSizeMap as aspectSizeMap}
      {#if aspectSizeMap?.standardAspect === true}
         <div class="aspect">
            <SpellStandardAspectTag
               aspect={standardAspects[aspectSizeMap.idx]}
            />
         </div>
      {:else if aspectSizeMap?.standardAspect === false}
         <div class="aspect">
            <SpellCustomAspectTag aspect={customAspects[aspectSizeMap.idx]}/>
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   .aspects {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      flex-wrap: wrap;

      .aspect {
         @include tag-margin;
      }
   }
</style>
