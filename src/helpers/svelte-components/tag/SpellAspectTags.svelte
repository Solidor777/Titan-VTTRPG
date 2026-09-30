<script>
   import SpellCustomAspectTag from '~/helpers/svelte-components/tag/SpellCustomAspectTag.svelte';
   import SpellAspectTag from '~/helpers/svelte-components/tag/SpellAspectTag.svelte';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';

   /**
    * @typedef {object} SpellAspectTagsProps
    * @property {DisplayedSpellAspect[]} [aspects] - The displayed Spell Aspects, as `selectDisplayedSpellAspects`
    * returns them. Standard entries render as SpellAspectTag, custom entries as SpellCustomAspectTag.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root container element.
    */

   /** @type {SpellAspectTagsProps} */
   let { aspects = void 0, testId = void 0 } = $props();

   /**
    * Calculates a number representing the approximate relative size of an Aspect Tag.
    * @param {object} aspect - The Aspect to calculate the tag size of.
    * @returns {number} A number representing the approximate relative size of an Aspect Tag.
    */
   function calculateAspectTagSize(aspect) {
      /** @type {number} */
      let retVal = 0;

      // Add +1 if the Aspect is scaling.
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

      // Add +2 if the Aspect has an opposed Resistance Check; `'none'` renders no Resistance Check stat.
      if (aspect.resistanceCheck && aspect.resistanceCheck !== 'none') {
         retVal += 2;
      }

      return retVal;
   }

   /**
    * @type {DisplayedSpellAspect[]}
    * The displayed aspects sorted by tag size from smallest to largest. `Array.prototype.sort` is stable, so aspects of
    * equal size keep their display order.
    */
   const sortedAspects = $derived([...aspects].sort((a, b) => sortAscending(
      calculateAspectTagSize(a.aspect),
      calculateAspectTagSize(b.aspect),
   )));
</script>

<!--Aspect Tag Container-->
<div class="tag-container" data-testid={testId}>

   <!--Each Aspect-->
   {#each sortedAspects as entry}
      {#if entry.isCustom}
         <!--Custom Aspect-->
         <div class="tag">
            <SpellCustomAspectTag aspect={entry.aspect}/>
         </div>
      {:else}
         <!--Standard Aspect-->
         <div class="tag">
            <SpellAspectTag aspect={entry.aspect}/>
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   .tag-container {
      @include tag-container;
   }
</style>
