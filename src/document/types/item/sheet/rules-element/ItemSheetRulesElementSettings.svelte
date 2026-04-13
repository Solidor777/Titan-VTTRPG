<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { DELETE_ICON } from '~/system/Icons.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';
   import ItemSheetConditionalCheckModifierSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetConditionalCheckModifierSettings.svelte';
   import ItemSheetFastHealingSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetFastHealingSettings.svelte';
   import ItemSheetConditionalRatingModifierSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetConditionalRatingModifierSettings.svelte';
   import ItemSheetFlatModifierSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte';
   import ItemSheetMulBaseSettings from '~/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte';
   import ItemSheetPersistentDamageSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetPersistentDamageSettings.svelte';
   import ItemSheetRollMessageSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetRollMessageSettings.svelte';
   import ItemSheetTurnMessageSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetTurnMessageSettings.svelte';
   import ItemSheetInvalidRulesElement
      from '~/document/types/item/sheet/rules-element/ItemSheetInvalidRulesElement.svelte';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The operation specific settings component for this Rules Element. */
   let operationSettingsComponent;
   $: {
      switch ($document?.system.rulesElement[idx]?.operation) {
         case 'conditionalCheckModifier': {
            operationSettingsComponent = ItemSheetConditionalCheckModifierSettings;
            break;
         }
         case 'conditionalRatingModifierSettings': {
            operationSettingsComponent = ItemSheetConditionalRatingModifierSettings;
            break;
         }
         case 'fastHealing': {
            operationSettingsComponent = ItemSheetFastHealingSettings;
            break;
         }
         case 'flatModifier': {
            operationSettingsComponent = ItemSheetFlatModifierSettings;
            break;
         }
         case 'mulBase': {
            operationSettingsComponent = ItemSheetMulBaseSettings;
            break;
         }
         case 'persistentDamage': {
            operationSettingsComponent = ItemSheetPersistentDamageSettings;
            break;
         }
         case 'rollMessage': {
            operationSettingsComponent = ItemSheetRollMessageSettings;
            break;
         }
         case 'turnMessage': {
            operationSettingsComponent = ItemSheetTurnMessageSettings;
            break;
         }
         default: {
            operationSettingsComponent = ItemSheetInvalidRulesElement;
            break;
         }
      }
   }

</script>

<!--Rules Element Settings-->
{#if $document?.system.rulesElement[idx]}
   <div class="rules-element" transition:slide|local>

      <div class="row">
         <!--Operation Select-->
         <div class="operation">
            <ItemSheetRulesElementOperationSelect {idx}/>
         </div>

         <!--Delete Button-->
         <div class="delete-button">
            <DocumentOwnerIconButton
               icon={DELETE_ICON}
               on:click={() => {
               $document.system.deleteRulesElement(idx);
            }}
            />
         </div>
      </div>

      <!--Operation Specific settings.-->
      <div class="row operation-settings">
         <svelte:component
            this={operationSettingsComponent}
            {idx}
         />
      </div>


      <!--Delete Element-->
      <div class="delete-button">
         <DocumentOwnerIconButton
            icon={DELETE_ICON}
            on:click={() => {
               $document.system.deleteRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   .rules-element {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include panel-1;

      width: 100%;

      .row {
         @include flex-row;
         @include flex-space-between;

         width: 100%;
      }
   }
</style>
