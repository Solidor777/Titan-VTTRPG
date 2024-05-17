<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {DAMAGE_ICON, DECREMENT_ICON, HEALING_ICON, INCREMENT_ICON, RESET_ICON} from '~/system/Icons.js';

   // Aspect
   export let idx = void 0;

   // Chat context
   const document = getContext('document');

   let aspect = $document.flags.titan.results.scalingAspect[idx]
   const aspectCost = aspect.scalingCost ?? aspect.cost ?? 1;
   const aspectIncrement = Math.max(aspect.initialValue, 1);

   $: {
      aspect = $document.flags.titan.results.scalingAspect[idx];
   }

   function increaseAspect() {
      // Increase the aspect
      aspect.currentValue += aspectIncrement;

      // Decrease the extra successes by the cost
      $document.flags.titan.results.extraSuccessesRemaining -= aspectCost;

      // Update damage if appropriate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage += aspectIncrement;
      }

      // Update healing if appropriate
      if (aspect.isHealing) {
         $document.flags.titan.results.healing += aspectIncrement;
      }

      // Update the document
      $document.update({
         flags: {
            titan: $document.flags.titan
         }
      });
   }

   function decreaseAspect() {
      // Decrease the aspect
      aspect.currentValue -= aspectIncrement;

      // Increase the extra successes by the cost
      $document.flags.titan.results.extraSuccessesRemaining += aspectCost;

      // Update damage if appropruate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage -= aspectIncrement;
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         $document.flags.titan.results.healing -= aspectIncrement;
      }

      // Update the document
      $document.update({
         flags: {
            titan: $document.flags.titan
         }
      });
   }

   function resetAspect() {
      // Get the aspect delta
      const delta = aspect.currentValue - aspect.initialValue;
      const incrementCount = delta / aspectIncrement;
      const cost = incrementCount * aspectCost;

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

      $document.update({
         flags: {
            titan: $document.flags.titan
         }
      });
   }
</script>

<!--Aspect-->
<div class="aspect">
   <!--Label and value-->
   <div class="label">
      <div class="label-inner">
         {#if aspect.label === localize('damage')}
            <i class="{DAMAGE_ICON}"/>
         {:else if aspect.label === localize('healing')}
            <i class="{HEALING_ICON}"/>
         {/if}
         {aspect.label}: {$document.flags.titan.results.scalingAspect[idx]
         .currentValue}
      </div>
      <div class="cost">
         {localize('cost')}: {`${aspectCost} ${localize(
         'extraSuccesses.short',
      )}`}
      </div>
   </div>

   <div class="controls">
      <!--Reset Button-->
      <div class="control">
         <Button
            disabled={aspect.currentValue <= aspect.initialValue}
            on:click={resetAspect}
         >
            <div class="button-inner">
               <i class="{RESET_ICON}"/>
            </div>
         </Button>
      </div>

      <!--Decrease Button-->
      <div class="control">
         <Button
            disabled={aspect.currentValue <= aspect.initialValue}
            on:click={decreaseAspect}
         >
            <div class="button-inner">
               <i class="{DECREMENT_ICON}"/>
            </div>
         </Button>
      </div>

      <!--Increase Button-->
      <div class="control">
         <Button
            disabled={$document.flags.titan.results.extraSuccessesRemaining <
               aspectCost}
            on:click={increaseAspect}
         >
            <div class="button-inner">
               <i class="{INCREMENT_ICON}"/>
            </div>
         </Button>
      </div>
   </div>
</div>

<style lang="scss">
   .aspect {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      min-height: 32px;
      height: 100%;
      @include font-size-small;

      .label {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         width: 100%;
         flex-wrap: wrap;
         font-weight: bold;
         margin-right: var(--padding-large);

         .label-inner {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            margin-bottom: var(--padding-standard);

            i {
               margin-right: var(--padding-standard);
            }
         }
      }

      .controls {
         @include flex-row;
         @include flex-group-right;
         flex-wrap: nowrap;
         height: 100%;
         --button-border-radius: var(--button-chat-message-border-radius);

         .control {
            height: 32px;

            &:not(:first-child) {
               margin-left: var(--padding-standard);
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
