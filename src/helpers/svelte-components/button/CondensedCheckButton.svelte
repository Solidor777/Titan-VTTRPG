<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {DICE_ICON, EXPERTISE_ICON, SPEND_RESOLVE_ICON} from '~/system/Icons.js';
   import {getContext} from 'svelte';

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type string The Attribute to be used for the check. */
   export let attribute = void 0;

   /** @type integer The Difficulty of the check. */
   export let difficulty = void 0;

   /** @type integer The Complexity of the check. */
   export let complexity = void 0;

   /** @type integer The total Dice for the check. */
   export let totalDice = void 0;

   /** @type integer The total Expertise for the check. */
   export let totalExpertise = void 0;

   /** @type integer The Resolve Cost the check. */
   export let resolveCost = void 0;

   /** @type string Icon to show in front of the check. */
   export let checkIcon = void 0;

   /** @type string The display Label of the check. */
   export let label = void 0;

   /** @type string Tooltip to show when hovering over the button. */
   export let tooltip = void 0;

</script>

<div class="check-button {attribute}">
   <Button
      disabled={!$document.isOwner}
      on:click
      tooltip={tooltip}
   >
      <div class="button-inner">
         <!--Check Icon & Label-->
         {#if checkIcon || label}
            <div class="label">

               <!-- Check Icon-->
               {#if checkIcon}
                  <i class="{checkIcon}"/>
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
         <div class="stat">
            <i class="{DICE_ICON}"/>
            {totalDice}
         </div>

         <!--Total Expertise-->
         {#if totalExpertise}
            <div class="stat">
               <i class="{EXPERTISE_ICON}"/>
               {totalExpertise}
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if resolveCost}
            <div class="stat">
               <i class="{SPEND_RESOLVE_ICON}"/>
               {resolveCost}
            </div>
         {/if}
      </div>
   </Button>
</div>

<style lang="scss">
   .check-button {
      @include flex-row;
      @include attribute-button;

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         line-height: normal;
         padding: var(--padding-standard);

         .stat {
            @include flex-row;
            @include flex-group-center;

            &:not(:first-child) {
               @include border-left;
               @include border-color-button;

               padding-left: var(--padding-standard);
               margin-left: var(--padding-standard);
            }

            i {
               margin-right: var(--padding-standard);
            }
         }
      }
   }
</style>
