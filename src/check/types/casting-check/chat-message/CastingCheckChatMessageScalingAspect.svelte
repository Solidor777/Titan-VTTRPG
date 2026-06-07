<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { DAMAGE_ICON, DECREMENT_ICON, HEALING_ICON, INCREMENT_ICON, RESET_ICON, } from '~/system/Icons.js';

   /**
    * @typedef {object} CastingCheckChatMessageScalingAspectProps
    * @property {number} [idx] - Index of the Scaling Aspect in the Scaling Aspects array.
    */

   /** @type {CastingCheckChatMessageScalingAspectProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {ScalingAspect} Reference to the scaling aspect. */
   const aspect = $derived(document.data.system.results.scalingAspect[idx]);

   /** @type {number} Calculated scaling cost of the aspect. */
   const aspectIncrement = $derived(Math.max(aspect.initialValue, 1));

   /** @type {string[]} Calculated aspect icons. */
   const icons = $derived.by(() => {
      // Build the icons array for this aspect.
      const result = [];

      // Add damage icon if appropriate.
      if (aspect.isDamage) {
         result.push(DAMAGE_ICON);
      }

      // Add healing icon if appropriate.
      if (aspect.isHealing) {
         result.push(HEALING_ICON);
      }

      return result;
   });

   /**
    * Increases the aspect by the increment and updates the total cost. Mutates a detached system clone
    * only — the live DataModel is never written; the update round-trip re-renders the card.
    */
   function increaseAspect() {
      // Clone the system data and address this aspect in the clone.
      const system = document.data.system.toObject();
      const clonedAspect = system.results.scalingAspect[idx];

      // Increase the aspect.
      clonedAspect.currentValue += aspectIncrement;

      // Decrease the extra successes by the cost.
      system.results.extraSuccessesRemaining -= clonedAspect.cost;

      // Update damage if appropriate.
      if (clonedAspect.isDamage) {
         system.results.damage += aspectIncrement;
      }

      // Update healing if appropriate.
      if (clonedAspect.isHealing) {
         system.results.healing += aspectIncrement;
      }

      // Update the document.
      document.data.update({
         system: {
            results: system.results,
         },
      });
   }

   /**
    * Decreases the aspect by the increment and updates the total cost. Mutates a detached system clone
    * only — the live DataModel is never written; the update round-trip re-renders the card.
    */
   function decreaseAspect() {
      // Clone the system data and address this aspect in the clone.
      const system = document.data.system.toObject();
      const clonedAspect = system.results.scalingAspect[idx];

      // Decrease the aspect.
      clonedAspect.currentValue -= aspectIncrement;

      // Increase the extra successes by the cost.
      system.results.extraSuccessesRemaining += clonedAspect.cost;

      // Update damage if appropriate.
      if (clonedAspect.isDamage) {
         system.results.damage -= aspectIncrement;
      }

      // Update healing if appropriate.
      if (clonedAspect.isHealing) {
         system.results.healing -= aspectIncrement;
      }

      // Update the document.
      document.data.update({
         system: {
            results: system.results,
         },
      });
   }

   /**
    * Resets all increases to the aspect and restores the total cost. Mutates a detached system clone
    * only — the live DataModel is never written; the update round-trip re-renders the card.
    */
   function resetAspect() {
      // Clone the system data and address this aspect in the clone.
      const system = document.data.system.toObject();
      const clonedAspect = system.results.scalingAspect[idx];

      // Get the aspect delta.
      const delta = clonedAspect.currentValue - clonedAspect.initialValue;
      const incrementCount = delta / aspectIncrement;
      const cost = incrementCount * clonedAspect.cost;

      // Reset the aspect to its original value.
      clonedAspect.currentValue = clonedAspect.initialValue;

      // Reset the extra successes.
      system.results.extraSuccessesRemaining += cost;

      // Update damage if appropriate.
      if (clonedAspect.isDamage) {
         system.results.damage -= delta;
      }

      // Update healing if appropriate.
      if (clonedAspect.isHealing) {
         system.results.healing -= delta;
      }

      document.data.update({
         system: {
            results: system.results,
         },
      });
   }
</script>

<!--Aspect-->
<div class="aspect">

   <!--Header-->
   <div class="header">

      <!--Label-->
      <div class="label">

         <!--Each Icon-->
         {#each icons as icon}
            <i class={icon}></i>
         {/each}

         <!--Label Text-->
         <div>{aspect.label}</div>
      </div>

      <!--Value-->
      <div class="value">{document.data.system.results.scalingAspect[idx].currentValue}</div>
   </div>

   <!-- Controls -->
   <div class="controls">

      <!--Incremental Cost-->
      <div class="cost">

         <!--Label-->
         <div class="label">
            {localize('cost')}
         </div>

         <!--Value-->
         <div class="value">
            {`${aspect.cost} ${localize('extraSuccesses.short')}`}
         </div>
      </div>

      <!--Reset Button-->
      <div class="control">
         <Button
            disabled={aspect.currentValue <= aspect.initialValue}
            onclick={resetAspect}
         >
            <div class="button-inner">
               <i class={RESET_ICON}></i>
            </div>
         </Button>
      </div>

      <!--Decrease Button-->
      <div class="control">
         <Button
            disabled={aspect.currentValue <= aspect.initialValue}
            onclick={decreaseAspect}
         >
            <div class="button-inner">
               <i class={DECREMENT_ICON}></i>
            </div>
         </Button>
      </div>

      <!--Increase Button-->
      <div class="control">
         <Button
            disabled={document.data.system.results.extraSuccessesRemaining <
               aspect.cost}
            onclick={increaseAspect}
         >
            <div class="button-inner">
               <i class={INCREMENT_ICON}></i>
            </div>
         </Button>
      </div>
   </div>
</div>

<style lang="scss">
   .aspect {
      @include border;
      @include tag;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;

      font-weight: bold;

      @include padding-standard;

      width: 100%;

      .label {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         i {
            @include margin-right-standard;
         }
      }

      .value {
         @include separator-left;
      }

      .header {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         flex-wrap: wrap;

         @include margin-right-large;
      }

      .controls {
         @include flex-row;
         @include flex-group-center;
         @include margin-top-standard;

         width: 100%;

         --titan-button-border-radius: var(--titan-button-border-radius);

         .cost {
            @include flex-row;
            @include flex-group-center;

            height: 100%;

            @include margin-right-large;
         }

         .control {
            @include flex-row;
            @include flex-group-center;
            @include margin-left-standard;

            .button-inner {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
            }
         }
      }
   }
</style>
