<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/documents/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import onRulesElementOperationChanged from './RulesElementUpdateOperation';
   import DocumentBoundEditorInput from '~/documents/components/input/DocumentBoundEditorInput.svelte';
   import DocumentRangeTypeSelect from '~/documents/components/select/DocumentRangeTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/documents/components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/documents/components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '../../../documents/components/input/DocumentIntegerInput.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');

   export let operationOptions = void 0;
   export let idx = void 0;

   // Selector options
   const selectorOptions = [
      {
         label: localize('attackTrait'),
         value: 'attackTrait',
      },
      {
         label: localize('attackType'),
         value: 'attackType',
      },
      {
         label: localize('customAttackTrait'),
         value: 'customAttackTrait',
      },
      {
         label: localize('customItemTrait'),
         value: 'customItemTrait',
      },
      {
         label: localize('multiAttack'),
         value: 'multiAttack',
      },
      {
         label: localize('spellTradition'),
         value: 'spellTradition',
      },
   ];

   // Dynamic element
   $: element = $document.system.rulesElement[idx];

   // Updates the key when the selector changes
   function onSelectorChange() {
      switch (element.selector) {
         case 'attackTrait': {
            element.key = 'blast';
            break;
         }
         case 'attackType': {
            element.key = 'melee';
            break;
         }
         case 'customAttackTrait':
         case 'customItemTrait':
         case 'multiAttack': {
            element.key = '';
            break;
         }
         case 'spellTradition': {
            element.key = localize('any');
            break;
         }
         default: {
            break;
         }
      }

      $document.update({
         system: $document.system,
      });
   }

   function getSelector() {
      switch (element.selector) {
         case 'attackTrait': {
            return DocumentAttackTraitSelect;
         }
         case 'attackType': {
            return DocumentRangeTypeSelect;
         }
         case 'customAttackTrait': {
            return DocumentTextInput;
         }
         case 'customItemTrait': {
            return DocumentTextInput;
         }
         case 'spellTradition': {
            return DocumentTextInput;
         }
         default: {
            break;
         }
      }
   }
</script>

{#if element && element.operation === 'conditionalDiceModifier'}
   <div class="element" transition:slide|local>
      <!--Element Operation-->
      <div class="settings">
         <div class="field select">
            <DocumentSelect
               options={operationOptions}
               bind:value={element.operation}
               on:change={() => {
                  onRulesElementOperationChanged($document, idx);
               }}
            />
         </div>

         <!--Selector-->
         <div class="field select">
            <DocumentSelect
               options={selectorOptions}
               bind:value={element.selector}
               on:change={onSelectorChange}
            />
         </div>

         <!--Key-->
         <div class="field select">
            <svelte:component this={getSelector()} bind:value={element.key} />
         </div>

         <!--Value-->
         <div class="field number">
            <DocumentIntegerInput bind:value={element.value} />
         </div>
      </div>

      <!--Delete Element-->
      <div class="delete-button">
         <IconButton
            icon={'fas fa-trash'}
            on:click={() => {
               $document.typeComponent.removeRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .element {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-1;
      width: 100%;
      height: 100%;

      .settings {
         @include flex-row;
         @include flex-group-left;
         flex-wrap: wrap;
         width: 100%;
         margin-bottom: 0.5rem;

         .field {
            @include flex-row;
            margin: 0.5rem 0.25rem 0 0.25rem;

            &.select {
               @include flex-group-left;
            }

            &.number {
               @include flex-group-center;
               width: 2rem;
            }
         }
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         margin: 0.5rem 0.25rem 0 0;
      }
   }
</style>
