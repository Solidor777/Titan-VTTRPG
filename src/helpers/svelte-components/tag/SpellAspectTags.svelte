<script>
   import SpellCustomAspectTag from "./SpellCustomAspectTag.svelte";
   import SpellStandardAspectTag from "./SpellStandardAspectTag.svelte";

   // Aspects list
   export let standardAspects = void 0;
   export let customAspects = void 0;

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
         return { idx: idx, size: getAspectSize(aspect), standardAspect: true };
      })
      .concat(
         customAspects.map((aspect, idx) => {
            return { idx: idx, size: getAspectSize(aspect), standardAspect: false };
         })
      )
      .sort((a, b) => {
         if (a.size > b.size) {
            return 1;
         }
         if (a.size < b.size) {
            return -1;
         }
         return 0;
      });
</script>

<div class="aspects">
   {#each aspectSizeMap as aspectSizeMap}
      {#if aspectSizeMap?.standardAspect === true}
         <div class="aspect">
            <SpellStandardAspectTag aspect={standardAspects[aspectSizeMap.idx]} />
         </div>
      {:else if aspectSizeMap?.standardAspect === false}
         <div class="aspect">
            <SpellCustomAspectTag aspect={customAspects[aspectSizeMap.idx]} />
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

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
