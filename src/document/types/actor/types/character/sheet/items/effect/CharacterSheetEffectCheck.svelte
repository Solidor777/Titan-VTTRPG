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

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CharacterSheetEffectCheckProps
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetEffectCheckProps} */
   const { checkIdx = undefined } = $props();

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /**
    * Builds the Check Options for this effect check, resolving fresh roll data from the effect.
    * The shared item-check engine cannot resolve an effect from the item collection, so the
    * effect's roll data is supplied directly via the engine's itemRollData passthrough branch.
    * @returns {ItemCheckOptions | undefined} The check options, or undefined if the effect or check is invalid.
    */
   function getCheckOptions() {
      // Resolve the live effect through the embedded bridge and ensure the check index is valid.
      const effect = document.data;
      if (effect?.system.check.length > checkIdx) {
         return {
            itemRollData: effect.getRollData(),
            checkIdx: checkIdx,
         };
      }
      return undefined;
   }

   /** @type {ItemCheckParameters | undefined} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Build the options from current effect roll data, then calculate the display parameters.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /**
    * Rolls the effect's Check via the shared item-check engine.
    */
   function rollEffectCheck() {
      // Build options fresh at roll time so the roll captures the effect's current state.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         sheetDocument.data.system.requestItemCheck(checkOptions);
      }
   }
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
                  onclick={() => rollEffectCheck()}
               />
            {:else}
               <!--Check Button-->
               <div>
                  <ItemCheckButton
                     label={checkParameters.checkLabel}
                     attribute={checkParameters.attribute}
                     disabled={!document.data?.isOwner}
                     onclick={() => rollEffectCheck()}
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
               onclick={() => rollEffectCheck()}
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
