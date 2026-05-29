<script>
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      SPEND_RESOLVE_ICON,
   } from '~/system/Icons.js';
   import { getContext } from 'svelte';
   import DocumentOwnerAttributeButton from '~/document/svelte-components/DocumentOwnerAttributeButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} CondensedCheckButtonProps
    * @property {string} [attribute] - The Attribute to be used for the check.
    * @property {number} [difficulty] - The Difficulty of the check.
    * @property {number} [complexity] - The Complexity of the check.
    * @property {number} [totalDice] - The total Dice for the check.
    * @property {number} [totalExpertise] - The total Expertise for the check.
    * @property {number} [resolveCost] - The Resolve Cost for the check.
    * @property {string} [checkIcon] - Icon to show in front of the check.
    * @property {string} [label] - The display Label of the check.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    */

   /** @type {CondensedCheckButtonProps} */
   const {
      attribute = void 0,
      difficulty = void 0,
      complexity = void 0,
      totalDice = void 0,
      totalExpertise = void 0,
      resolveCost = void 0,
      checkIcon = void 0,
      label = void 0,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
</script>

<div class="check-button {attribute}">
   <DocumentOwnerAttributeButton
      {attribute}
      {onclick}
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
               @include separator-left;
            }

            i {
               @include margin-right-standard;
            }
         }
      }
   }
</style>
