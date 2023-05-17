<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Aspect
   export let idx = void 0;

   // Chat context
   const document = getContext('DocumentStore');

   $: aspect = $document.flags.titan.results.scalingAspect[idx];
   $: aspectCost = aspect.scalingCost ?? aspect.cost ?? 0;

   function increaseAspect() {
      // Increase the aspect
      aspect.currentValue += Math.max(aspect.initialValue, 1);

      // Decrease the extra successes by the cost
      $document.flags.titan.results.extraSuccessesRemaining -= aspectCost;

      // Update damage if appropruate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage += Math.max(
            aspect.initialValue,
            1
         );
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         $document.flags.titan.results.healing += Math.max(
            aspect.initialValue,
            1
         );
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });

      return;
   }

   function decreaseAspect() {
      // Decrease the aspect
      aspect.currentValue -= Math.max(aspect.initialValue, 1);

      // Increase the extra successes by the cost
      $document.flags.titan.results.extraSuccessesRemaining += aspectCost;

      // Update damage if appropruate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage -= Math.max(
            aspect.initialValue,
            1
         );
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         $document.flags.titan.results.healing -= Math.max(
            aspect.initialValue,
            1
         );
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });

      return;
   }

   function resetAspect() {
      // Get the aspect delta
      const delta = aspect.currentValue - aspect.initialValue;
      const cost = delta * aspectCost;

      // Reset the aspect to its original value
      aspect.currentValue = aspect.initialValue;

      // Reset the extra successes
      $document.flags.titan.results.extraSuccessesRemaining += cost;

      // Update damage if appropruate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage -= delta;
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         $document.flags.titan.results.healing -= delta;
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });

      return;
   }
</script>

<!--Aspect-->
<div class="aspect">
   <!--Label and value-->
   <div class="label">
      <div class="label-inner">
         {#if aspect.label === localize('damage')}
            <i class="fas fa-burst" />
         {:else if aspect.label === localize('healing')}
            <i class="fas fa-heart" />
         {/if}
         {aspect.label}: {$document.flags.titan.results.scalingAspect[idx]
            .currentValue}
      </div>
      <div class="cost">
         {localize('cost')}: {`${aspectCost} ${localize(
            'extraSuccesses.short'
         )}`}
      </div>
   </div>

   <div class="controls">
      <!--Reset Button-->
      <div class="control">
         <EfxButton
            on:click={resetAspect}
            disabled={aspect.currentValue <= aspect.initialValue}
         >
            <div class="button-inner">
               <i class="fas fa-arrow-rotate-left" />
            </div>
         </EfxButton>
      </div>

      <!--Decrease Button-->
      <div class="control">
         <EfxButton
            on:click={decreaseAspect}
            disabled={aspect.currentValue <= aspect.initialValue}
         >
            <div class="button-inner">
               <i class="fas fa-minus" />
            </div>
         </EfxButton>
      </div>

      <!--Increase Button-->
      <div class="control">
         <EfxButton
            on:click={increaseAspect}
            disabled={$document.flags.titan.results.extraSuccessesRemaining <
               aspectCost}
         >
            <div class="button-inner">
               <i class="fas fa-plus" />
            </div>
         </EfxButton>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../styles/mixins.scss';
   .aspect {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      min-height: 2rem;
      height: 100%;
      @include font-size-small;

      .label {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         width: 100%;
         flex-wrap: wrap;
         font-weight: bold;
         margin-right: 0.5rem;

         .label-inner {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            margin-bottom: 0.25rem;

            i {
               margin-right: 0.25rem;
            }
         }
      }

      .controls {
         @include flex-row;
         @include flex-group-right;
         flex-wrap: nowrap;
         height: 100%;
         --button-border-radius: 10px;

         .control {
            height: 2rem;

            &:not(:first-child) {
               margin-left: 0.25rem;
            }

            .button-inner {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
            }
         }
      }
   }
</style>
