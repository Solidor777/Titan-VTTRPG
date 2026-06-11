<script>
   import { getContext } from 'svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
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
   import ItemSheetMulSumSettings from '~/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte';
   import ItemSheetSetSumSettings from '~/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte';
   import ItemSheetPersistentDamageSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetPersistentDamageSettings.svelte';
   import ItemSheetRollMessageSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetRollMessageSettings.svelte';
   import ItemSheetTurnMessageSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetTurnMessageSettings.svelte';
   import ItemSheetInvalidRulesElement
      from '~/document/types/item/sheet/rules-element/ItemSheetInvalidRulesElement.svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import DragHandle from '~/helpers/svelte-components/drag-reorder/DragHandle.svelte';

   /**
    * @typedef {object} ItemSheetRulesElementSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetRulesElementSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * The operation-specific settings component for this Rules Element.
    * @type {object | undefined}
    */
   const operationSettingsComponent = $derived.by(() => {
      switch (document.data?.system.rulesElement[idx]?.operation) {
         case 'conditionalCheckModifier': {
            return ItemSheetConditionalCheckModifierSettings;
         }
         case 'conditionalRatingModifier': {
            return ItemSheetConditionalRatingModifierSettings;
         }
         case 'fastHealing': {
            return ItemSheetFastHealingSettings;
         }
         case 'flatModifier': {
            return ItemSheetFlatModifierSettings;
         }
         case 'mulBase': {
            return ItemSheetMulBaseSettings;
         }
         case 'mulSum': {
            return ItemSheetMulSumSettings;
         }
         case 'setSum': {
            return ItemSheetSetSumSettings;
         }
         case 'persistentDamage': {
            return ItemSheetPersistentDamageSettings;
         }
         case 'rollMessage': {
            return ItemSheetRollMessageSettings;
         }
         case 'turnMessage': {
            return ItemSheetTurnMessageSettings;
         }
         default: {
            return ItemSheetInvalidRulesElement;
         }
      }
   });
</script>

<!--Rules Element Settings-->
{#if document.data?.system.rulesElement[idx]}
   <div class="rules-element">
      <div class="row">
         <!--Drag handle-->
         <DragHandle/>

         <!--Operation Select-->
         <div class="operation">
            <LabeledElement label="operation">
               <ItemSheetRulesElementOperationSelect {idx}/>
            </LabeledElement>
         </div>

         <!--Delete Button-->
         <div class="delete-button">
            <DocumentOwnerIconButton
               icon={DELETE_ICON}
               label={localize('delete')}
               onclick={() => {
               document.data.system.deleteRulesElement(idx);
            }}
            />
         </div>
      </div>

      <!--Operation Specific settings.-->
      <div class="row operation-settings">
         {#each [operationSettingsComponent] as OpSettings}
            <OpSettings {idx}/>
         {/each}
      </div>
   </div>
{/if}

<style lang="scss">
   .rules-element {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include panel-1;
      @include padding-large;

      width: 100%;

      .row {
         @include flex-row;
         @include flex-space-between;

         width: 100%;
      }
   }
</style>
