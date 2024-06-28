<script>
   import SpellCustomAspectTag from '~/helpers/svelte-components/tag/SpellCustomAspectTag.svelte';
   import SpellStandardAspectTag from '~/helpers/svelte-components/tag/SpellStandardAspectTag.svelte';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';

   // Aspects list
   /** @type object[] Array of Spell Custom Aspects to display. */
   export let standardAspects = void 0;

   /** @type SpellCustomAspect[] Array of Spell Custom Aspects to display. */
   export let customAspects = void 0;

   /**
    * Calculates a number representing the approximate relative size of an Aspect Tag.
    * @param {object} aspect - The Aspect to calculate the tag size of.
    * @returns {number} A number representing the approximate relative size of an Aspect Tag.
    */
   function calculateAspectTagSize(aspect) {
      let retVal = 0;

      // Add +1 is the Aspect is scaling.
      if (aspect.scaling) {
         retVal += 1;
      }

      // Add +1 if the Aspect has All Options.
      if (aspect.allOptions) {
         retVal += 1;
      }

      // Add +1 for each Aspect Option.
      else if (aspect.option) {
         retVal += aspect.option.length;
      }

      // Add +2 if the Aspect has an opposed Resistance Check.
      if (aspect.resistanceCheck) {
         retVal += 2;
      }

      return retVal;
   }

   /**
    * @type object[]
    * List of all Aspects with a mapping of their index in their corresponding array, sorted from
    * smallest to largest.
    */
   const aspectSizeMap = standardAspects
      .map((aspect, idx) => {
         return {
            idx: idx,
            standardAspect: true
         };
      })
      .concat(
         customAspects.map((aspect, idx) => {
            return {
               idx: idx,
               standardAspect: false,
            };
         }),
      )
      .sort((a, b) => sortAscending(calculateAspectTagSize(a), calculateAspectTagSize(b)));
</script>

<!--Aspect Tag Container-->
<div class="tag-container">

   <!--Each Aspect-->
   {#each aspectSizeMap as aspect}
      {#if aspect?.standardAspect === true}
         <!--Standard Aspect-->
         <div class="tag">
            <SpellStandardAspectTag
               aspect={standardAspects[aspect.idx]}
            />
         </div>
      {:else}
         <!--Custom Aspect-->
         <div class="tag">
            <SpellCustomAspectTag aspect={customAspects[aspect.idx]}/>
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   .tag-container {
      @include tag-container;
   }
</style>
