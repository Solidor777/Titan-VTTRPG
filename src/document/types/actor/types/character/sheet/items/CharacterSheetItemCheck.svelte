<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import ItemCheckButton from '~/helpers/svelte-components/button/ItemCheckButton.svelte';
   import SpendResolveButton from '~/helpers/svelte-components/button/SpendResolveButton.svelte';
   import {DICE_ICON, EXPERTISE_ICON, SPEND_RESOLVE_ICON, TRAINING_ICON} from '~/system/Icons.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string The ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type number The index of the check in the checks array. */
   export let checkIdx = void 0;

   /** @type ItemCheckOptions Options for the check. */
   const checkOptions = {
      itemId: itemId,
      checkIdx: checkIdx
   };

   /** @type boolean Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = getSetting('autoSpendResolveChecks');

   /** @type ItemCheckParameters Calculated item check parameters. */
   let checkParameters;

   // Update the svelte-components in response to changes
   $: {

      // Ensure the item and check are valid
      const item = $document.items.get(itemId);
      if (item?.system.check.length > checkIdx
      ) {

         // Update the check parameters
         checkParameters = $document.system.getItemCheckParameters(
            $document.system.initializeItemCheckOptions(checkOptions)
         );
      }
   }

   /**
    * Rolls the Item Check.
    */
   function rollItemCheck() {
      $document.system.requestItemCheck(checkOptions);
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
               disabled={!$document.isOwner}
               resolveCost={checkParameters.resolveCost}
               on:click={() => rollItemCheck()}
            />
         {:else}
            <!--Check Button-->
            <div>
               <ItemCheckButton
                  label={checkParameters.checkLabel}
                  attribute={checkParameters.attribute}
                  disabled={!$document.isOwner}
                  on:click={() => rollItemCheck()}
               />
            </div>

            <!--Resolve Cost Button-->
            <div class="resolve-cost-button">
               <SpendResolveButton
                  resolveCost={checkParameters.resolveCost}
                  on:click={() => $document.system.spendResolve(checkParameters.resolveCost)}
               />
            </div>
         {/if}
      {:else}
         <!--Check Button-->
         <ItemCheckButton
            label={checkParameters.checkLabel}
            attribute={checkParameters.attribute}
            disabled={!$document.isOwner}
            resolveCost={checkParameters.resolveCost}
            on:click={() => rollItemCheck()}
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
            <OpposedCheckTag opposedCheck={checkParameters.opposedCheck}/>
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
            margin-left: var(--titan-padding-large);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;

         flex-wrap: wrap;

         .stat {
            @include tag-margin;
         }
      }
   }
</style>
