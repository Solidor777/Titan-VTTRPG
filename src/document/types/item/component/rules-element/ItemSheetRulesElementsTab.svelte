<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ItemSheetFlatModifierSettings
      from '~/document/types/item/component/rules-element/ItemSheetFlatModifierSettings.svelte';
   import ItemSheetMulBaseSettings from '~/document/types/item/component/rules-element/ItemSheetMulBaseSettings.svelte';
   import ItemSheetTurnMessageSettings
      from '~/document/types/item/component/rules-element/ItemSheetTurnMessageSettings.svelte';
   import ItemSheetFastHealingSettings
      from '~/document/types/item/component/rules-element/ItemSheetFastHealingSettings.svelte';
   import ItemSheetPersistentDamageSettings
      from '~/document/types/item/component/rules-element/ItemSheetPersistentDamageSettings.svelte';
   import ItemSheetRollMessageSettings
      from '~/document/types/item/component/rules-element/ItemSheetRollMessageSettings.svelte';
   import ItemSheetConditionaRatingModifierSettings
      from '~/document/types/item/component/rules-element/ItemSheetConditionalRatingModifierSettings.svelte';
   import ItemSheetConditionaCheckModifierSettings
      from '~/document/types/item/component/rules-element/ItemSheetConditionalCheckModifierSettings.svelte';
   import ItemSheetInvalidRulesElement
      from '~/document/types/item/component/rules-element/ItemSheetInvalidRulesElement.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');

   const operationOptions = [
      {
         label: localize('flatModifier'),
         value: 'flatModifier',
      },
      {
         label: localize('mulBase'),
         value: 'mulBase',
      },
      {
         label: localize('fastHealing'),
         value: 'fastHealing',
      },
      {
         label: localize('persistentDamage'),
         value: 'persistentDamage',
      },
      {
         label: localize('turnMessage'),
         value: 'turnMessage',
      },
      {
         label: localize('rollMessage'),
         value: 'rollMessage',
      },
      {
         label: localize('conditionalRatingModifier'),
         value: 'conditionalRatingModifier',
      },
      {
         label: localize('conditionalCheckModifier'),
         value: 'conditionalCheckModifier',
      },
   ];

   /**
    * @param operation
    */
   function selectComponent(operation) {
      switch (operation) {
         case 'flatModifier': {
            return ItemSheetFlatModifierSettings;
         }

         case 'mulBase': {
            return ItemSheetMulBaseSettings;
         }

         case 'turnMessage': {
            return ItemSheetTurnMessageSettings;
         }

         case 'fastHealing': {
            return ItemSheetFastHealingSettings;
         }

         case 'persistentDamage': {
            return ItemSheetPersistentDamageSettings;
         }

         case 'rollMessage': {
            return ItemSheetRollMessageSettings;
         }

         case 'conditionalRatingModifier': {
            return ItemSheetConditionaRatingModifierSettings;
         }

         case 'conditionalCheckModifier': {
            return ItemSheetConditionaCheckModifierSettings;
         }

         default: {
            return ItemSheetInvalidRulesElement;
         }
      }
   }
</script>

<div class="tab">
   {#if $document.system.rulesElement.length > 0}
      <!--Filter-->
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter={$appState.filter.rulesElements}/>
      </div>
   {/if}

   <!--Scrolling Content-->
   <ScrollingContainer>
      <!-- Rules Element List-->
      {#if $document.system.rulesElement.length > 0}
         <ol transition:slide|local>
            <!--Each Element-->
            {#each $document.system.rulesElement as element, idx (element.uuid)}
               <li transition:slide|local>
                  <svelte:component
                     this={selectComponent(
                        $document.system.rulesElement[idx].operation,
                     )}
                     {idx}
                     {element}
                     {operationOptions}
                  />
               </li>
            {/each}
         </ol>
      {/if}

      <!--Add Element Button-->
      <div class="add-entry-button">
         <Button
            on:click={() => {
               $document.system.addRulesElement();
            }}
         >
            <!--Button Content-->
            <div class="button-content">
               <!--Icon-->
               <i class="{CREATE_ICON}"/>

               <!--Label-->
               <div class="label">
                  {localize('addRulesElement')}
               </div>
            </div>
         </Button>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;

      height: 100%;
      width: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
      }

      ol {
         @include flex-column;
         @include flex-group-top;
         @include list;

         width: 100%;

         li {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin-top: var(--padding-large);
         }
      }

      .add-entry-button {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
         margin-top: var(--padding-large);

         .button-content {
            @include flex-row;
            @include flex-group-center;

            i {
               margin-right: var(--padding-standard);
            }
         }
      }
   }
</style>
