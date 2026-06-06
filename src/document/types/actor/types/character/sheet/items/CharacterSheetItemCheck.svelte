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

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CharacterSheetItemCheckProps
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetItemCheckProps} */
   const { checkIdx = undefined } = $props();

   // The id and index are fixed for this component's lifetime (provider instances are id-keyed); the
   // checkOptions object is intentionally built once and reused across derived reads and event handlers.
   // svelte-ignore state_referenced_locally
   /** @type {ItemCheckOptions} Options for the check. */
   const checkOptions = {
      itemId: document.doc._id,
      checkIdx: checkIdx,
   };

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /** @type {ItemCheckParameters} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      if (document.data?.system.check.length > checkIdx) {

         // Update the check parameters.
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /**
    * Rolls the Item Check.
    */
   function rollItemCheck() {
      sheetDocument.data.system.requestItemCheck(checkOptions);
   }
</script>

<!--Check-->
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
               onclick={() => rollItemCheck()}
            />
         {:else}
            <!--Check Button-->
            <div>
               <ItemCheckButton
                  label={checkParameters.checkLabel}
                  attribute={checkParameters.attribute}
                  disabled={!document.data?.isOwner}
                  onclick={() => rollItemCheck()}
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
            onclick={() => rollItemCheck()}
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
