<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import autoSpendResolveChecks from '~/helpers/Settings/AutoSpendResolveChecks.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';

   /** @type {object} The embedded item or effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CheckRowProps
    * @property {ItemCheckParameters} [checkParameters] Calculated check parameters; renders nothing when undefined.
    * @property {number} [checkIdx] The index of the check in the checks array.
    * @property {(() => void) | undefined} [onRoll] Callback invoked when the check button is clicked.
    */

   /** @type {CheckRowProps} */
   const {
      checkParameters = undefined,
      checkIdx = undefined,
      onRoll = undefined,
   } = $props();

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();
</script>

<!--Check-->
{#if checkParameters}
   <div class="check">
      <!--Buttons-->
      <div class="buttons">
         {#if checkParameters.resolveCost}
            {#if autoSpendResolve}
               <!--Combined Item Check and Spend Resolve button-->
               <ItemCheckButton
                  label={checkParameters.checkLabel}
                  attribute={checkParameters.attribute}
                  disabled={!document.data?.isOwner}
                  resolveCost={checkParameters.resolveCost}
                  onclick={() => onRoll()}
               />
            {:else}
               <!--Check Button-->
               <div>
                  <ItemCheckButton
                     label={checkParameters.checkLabel}
                     attribute={checkParameters.attribute}
                     disabled={!document.data?.isOwner}
                     onclick={() => onRoll()}
                  />
               </div>

               <!--Resolve Cost Button-->
               <div class="resolve-cost-button">
                  <SpendResolveButton
                     resolveCost={checkParameters.resolveCost}
                     onclick={() => sheetDocument.data.system.spendResolve(checkParameters.resolveCost)}
                  />
               </div>
            {/if}
         {:else}
            <!--Check Button-->
            <ItemCheckButton
               label={checkParameters.checkLabel}
               attribute={checkParameters.attribute}
               disabled={!document.data?.isOwner}
               resolveCost={checkParameters.resolveCost}
               onclick={() => onRoll()}
            />
         {/if}
      </div>

      <div class="stats">
         <!--Intrinsic check tags (shared component; attribute carries the actor-resolved value)-->
         <CheckTags
            attribute={checkParameters.attribute}
            idx={checkIdx}
         />

         <!--Dice-->
         <div class="stat">
            <IconStatTag
               icon={DICE_ICON}
               label={localize('dice')}
               value={checkParameters.totalDice}
            />
         </div>

         <!--Training-->
         {#if checkParameters.totalTrainingDice}
            <div class="stat">
               <IconStatTag
                  label={localize('training')}
                  value={checkParameters.totalTrainingDice}
                  icon={TRAINING_ICON}
               />
            </div>
         {/if}

         <!--Expertise-->
         {#if checkParameters.totalExpertise}
            <div class="stat">
               <IconStatTag
                  label={localize('expertise')}
                  value={checkParameters.totalExpertise}
                  icon={EXPERTISE_ICON}
               />
            </div>
         {/if}
      </div>
   </div>
{/if}

<style lang="scss">
   .check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .buttons {
         @include flex-row;

         .resolve-cost-button {
            @include margin-left-large;
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;

         flex-wrap: wrap;

         .stat {
            @include tag-container-child-margin;
         }
      }
   }
</style>
