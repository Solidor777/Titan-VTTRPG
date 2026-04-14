<script>
   import { DICE_ICON, EXPERTISE_ICON, SPEND_RESOLVE_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';
   import DocumentOwnerAttributeButton from '~/document/svelte-components/DocumentOwnerAttributeButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The Attribute to be used for the check. */
   export let attribute = void 0;

   /** @type {isInteger} The Difficulty of the check. */
   export let difficulty = void 0;

   /** @type {isInteger} The Complexity of the check. */
   export let complexity = void 0;

   /** @type {isInteger} The total Dice for the check. */
   export let totalDice = void 0;

   /** @type {isInteger} The total Expertise for the check. */
   export let totalExpertise = void 0;

   /** @type {isInteger} The Resolve Cost the check. */
   export let resolveCost = void 0;

   /** @type {string} Icon to show in front of the check. */
   export let checkIcon = void 0;

   /** @type {string} The display Label of the check. */
   export let label = void 0;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="check-button {attribute}">
   <DocumentOwnerAttributeButton
      {attribute}
      on:click
      tooltip={tooltip}
   >
      <div class="button-inner">
         <!--Check Icon & Label-->
         {#if checkIcon || label}
            <div class="label">

               <!-- Check Icon-->
               {#if checkIcon}
                  <i class={checkIcon}/>
               {/if}

               <!--Label-->
               {#if label}
                  <div>
                     {label}
                  </div>
               {/if}
            </div>
         {/if}

         <!--Difficulty and Complexity-->
         {#if difficulty}
            <div class="stat">
               {difficulty}:{complexity}
            </div>
         {/if}

         <!--Total Dice-->
         {#if totalDice}
            <div class="stat">
               <i class={DICE_ICON}/>
               {totalDice}
            </div>
         {/if}

         <!--Total Expertise-->
         {#if totalExpertise}
            <div class="stat">
               <i class={EXPERTISE_ICON}/>
               {totalExpertise}
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if resolveCost}
            <div class="stat">
               <i class={SPEND_RESOLVE_ICON}/>
               {resolveCost}
            </div>
         {/if}
      </div>
   </DocumentOwnerAttributeButton>
</div>

<style lang="scss">
   .check-button {
      @include flex-row;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         .stat {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               @include border-left;

               padding-left: var(--titan-spacing-standard);
               margin-left: var(--titan-spacing-standard);
            }

            i {
               margin-right: var(--titan-spacing-standard);
            }
         }
      }
   }
</style>
