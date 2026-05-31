<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import autoSpendResolveChecks from '~/helpers/Settings/AutoSpendResolveChecks.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      SPEND_RESOLVE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} CharacterSheetEffectCheckProps
    * @property {string} [effectId] The ID of the effect to get the check from.
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetEffectCheckProps} */
   const { effectId = undefined, checkIdx = undefined } = $props();

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /**
    * Builds the Check Options for this effect check, resolving fresh roll data from the effect.
    * The shared item-check engine cannot resolve an effect from the item collection, so the
    * effect's roll data is supplied directly via the engine's itemRollData passthrough branch.
    * @returns {ItemCheckOptions | undefined} The check options, or undefined if the effect or check is invalid.
    */
   function getCheckOptions() {
      // Resolve the effect from the reactive collection and ensure the check index is valid.
      const effect = document.data.effects.get(effectId);
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
         return document.data.system.getItemCheckParameters(
            document.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /**
    * Rolls the effect's Check via the shared item-check engine.
    */
   function rollEffectCheck() {
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         document.data.system.requestItemCheck(checkOptions);
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
                  disabled={!document.data.isOwner}
                  resolveCost={checkParameters.resolveCost}
                  onclick={() => rollEffectCheck()}
               />
            {:else}
               <!--Check Button-->
               <div>
                  <ItemCheckButton
                     label={checkParameters.checkLabel}
                     attribute={checkParameters.attribute}
                     disabled={!document.data.isOwner}
                     onclick={() => rollEffectCheck()}
                  />
               </div>

               <!--Resolve Cost Button-->
               <div class="resolve-cost-button">
                  <SpendResolveButton
                     resolveCost={checkParameters.resolveCost}
                     onclick={() => document.data.system.spendResolve(checkParameters.resolveCost)}
                  />
               </div>
            {/if}
         {:else}
            <!--Check Button-->
            <ItemCheckButton
               label={checkParameters.checkLabel}
               attribute={checkParameters.attribute}
               disabled={!document.data.isOwner}
               resolveCost={checkParameters.resolveCost}
               onclick={() => rollEffectCheck()}
            />
         {/if}
      </div>

      <div class="stats">
         <!--DC, Attribute, and Skill-->
         <div class="stat">
            <AttributeCheckTag
               attribute={checkParameters.attribute}
               complexity={checkParameters.complexity}
               difficulty={checkParameters.difficulty}
               skill={checkParameters.skill}
            />
         </div>

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

         <!--Resolve Cost-->
         {#if checkParameters.resolveCost}
            <div class="stat">
               <IconStatTag
                  label={localize('resolveCost')}
                  value={checkParameters.resolveCost}
                  icon={SPEND_RESOLVE_ICON}
               />
            </div>
         {/if}

         <!--Resistance Check-->
         {#if checkParameters.resistanceCheck !== 'none'}
            <div class="stat">
               <ResistedByTag resistance={checkParameters.resistanceCheck}/>
            </div>
         {/if}

         <!--Opposed Check-->
         {#if checkParameters.opposedCheck.enabled}
            <div class="stat">
               <OpposedCheckTag
                  attribute={checkParameters.opposedCheck.attribute}
                  skill={checkParameters.opposedCheck.skill}
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
