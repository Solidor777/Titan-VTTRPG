<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {DAMAGE_ICON, DECREMENT_ICON, HEALING_ICON, INCREMENT_ICON, RESET_ICON} from '~/system/Icons.js';

   /** @type number Index of the Scaling Aspect in the Scaling Aspects array. */
   export let idx = void 0;

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type ScalingAspect Reference to the scaling aspect. */
   let aspect = $document.flags.titan.results.scalingAspect[idx]

   /** @type number Calculated scaling cost of the aspect. */
   const aspectIncrement = Math.max(aspect.initialValue, 1);

   /** @type string[] Calculated aspect icons */
   const icons = [];

   // Add damage icon if appropriate
   if (aspect.isDamage) {
      icons.push(DAMAGE_ICON);
   }

   // Add healing icon if appropriate
   if (aspect.isHealing) {
      icons.push(HEALING_ICON);
   }

   // Update the aspect in response to changes.
   $: {
      aspect = $document.flags.titan.results.scalingAspect[idx];
   }

   // Increases the aspect by the increment, updating the total cost as appropriate.
   function increaseAspect() {
      // Increase the aspect
      aspect.currentValue += aspectIncrement;

      // Decrease the extra successes by the cost
      $document.flags.titan.results.extraSuccessesRemaining -= aspect.cost;

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

   // Decreases the aspect by the increment, updating the total cost as appropriate.
   function decreaseAspect() {
      // Decrease the aspect
      aspect.currentValue -= aspectIncrement;

      // Increase the extra successes by the cost
      $document.flags.titan.results.extraSuccessesRemaining += aspect.cost;

      // Update damage if appropriate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage -= aspectIncrement;
      }

      // Update healing if appropriate
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

   // Resets all increases to the aspect, updating the total cost as appropriate.
   function resetAspect() {
      // Get the aspect delta
      const delta = aspect.currentValue - aspect.initialValue;
      const incrementCount = delta / aspectIncrement;
      const cost = incrementCount * aspect.cost;

      // Reset the aspect to its original value
      aspect.currentValue = aspect.initialValue;

      // Reset the extra successes
      $document.flags.titan.results.extraSuccessesRemaining += cost;

      // Update damage if appropriate
      if (aspect.isDamage) {
         $document.flags.titan.results.damage -= delta;
      }

      // Update healing if appropriate
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

   <!--Header-->
   <div class="header">

      <!--Label-->
      <div class="label">

         <!--Each Icon-->
         {#each icons as icon}
            <i class={icon}/>
         {/each}

         <!--Label Text-->
         <div>{aspect.label}</div>
      </div>

      <!--Value-->
      <div class="value">{$document.flags.titan.results.scalingAspect[idx].currentValue}</div>
   </div>

   <!-- Controls-->
   <div class="controls">

      <!--Incremental Cost-->
      <div class="cost">

         <!--Label-->
         <div class="label">
            {localize('cost')}
         </div>

         <!--Value-->
         <div class="value">
            {`${aspect.cost} ${localize('extraSuccesses.short',)}`}
         </div>
      </div>

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
               aspect.cost}
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
      @include border;
      @include label;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;
      
      font-weight: bold;
      padding: var(--padding-standard);
      width: 100%;

      .label {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         i {
            margin-right: var(--padding-standard);
         }
      }

      .value {
         @include border-left;

         margin-left: var(--padding-standard);
         padding-left: var(--padding-standard);
      }

      .header {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         flex-wrap: wrap;
         margin-right: var(--padding-large);
      }

      .controls {
         @include flex-row;
         @include flex-group-center;

         margin-top: var(--padding-standard);
         width: 100%;

         --button-border-radius: var(--button-chat-message-border-radius);

         .cost {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            margin-right: var(--padding-large);
         }

         .control {
            @include flex-row;
            @include flex-group-center;

            margin-left: var(--padding-standard);

            .button-inner {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
            }
         }
      }
   }
</style>
