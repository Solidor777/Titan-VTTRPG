<script>
   import SpellAspectTag from "./SpellAspectTag.svelte";

   // Aspects list
   export let aspects = void 0;

   // Sort the aspects by size
   $: aspectSizeMap = aspects
      .map((aspect, idx) => {
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
         return { idx: idx, size: size };
      })
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
      {#if aspects[aspectSizeMap.idx]}
         <div class="aspect">
            <SpellAspectTag aspect={aspects[aspectSizeMap.idx]} />
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
