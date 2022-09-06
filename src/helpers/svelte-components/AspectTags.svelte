<script>
   import AspectTag from "./AspectTag.svelte";

   // Aspects list
   export let aspects = void 0;

   // Sort the aspects by size
   let aspectSizeMap = [];
   aspects.forEach((aspect, idx) => {
      let size = 0;

      if (aspect.overcast) {
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
      aspectSizeMap.push({ idx: idx, size: size });
   });
   aspectSizeMap = aspectSizeMap.sort((a, b) => {
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
            <AspectTag aspect={aspects[aspectSizeMap.idx]} />
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .aspects {
      @include flex-row;
      @include flex-space-evenly;
      flex-wrap: wrap;

      .aspect {
         margin: 0.25rem;
      }
   }
</style>
