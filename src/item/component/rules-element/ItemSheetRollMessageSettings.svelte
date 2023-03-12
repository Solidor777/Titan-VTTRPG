<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/documents/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentSkillSelect from '~/documents/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/documents/components/select/DocumentAttributeSelect.svelte';
   import DocumentResistanceSelect from '~/documents/components/select/DocumentResistanceSelect.svelte';
   import onRulesElementOperationChanged from './RulesElementUpdateOperation';
   import DocumentBoundEditorInput from '~/documents/components/input/DocumentBoundEditorInput.svelte';
   import DocumentRangeTypeSelect from '~/documents/components/select/DocumentRangeTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/documents/components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/documents/components/input/DocumentTextInput.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');

   export let operationOptions = void 0;
   export let idx = void 0;
   export let element = void 0;

   // Check type options
   const checkTypeOptions = [
      {
         label: localize('anyCheck'),
         value: 'any',
      },
      {
         label: localize('attributeCheck'),
         value: 'attribute',
      },
      {
         label: localize('attackCheck'),
         value: 'attack',
      },
      {
         label: localize('castingCheck'),
         value: 'casting',
      },
      {
         label: localize('itemCheck'),
         value: 'item',
      },
      {
         label: localize('resistanceCheck'),
         value: 'resistance',
      },
   ];

   // Selector options by check type
   const selectorOptions = {
      any: [
         {
            label: localize('attribute'),
            value: 'attribute',
         },
         {
            label: localize('customTrait'),
            value: 'customTrait',
         },
         {
            label: localize('skill'),
            value: 'skill',
         },
      ],
      attribute: [
         {
            label: localize('attribute'),
            value: 'attribute',
         },
         {
            label: localize('skill'),
            value: 'skill',
         },
      ],
      attack: [
         {
            label: localize('attribute'),
            value: 'attribute',
         },
         {
            label: localize('attackTrait'),
            value: 'attackTrait',
         },
         {
            label: localize('attackType'),
            value: 'attackType',
         },
         {
            label: localize('customTrait'),
            value: 'customTrait',
         },
         {
            label: localize('multiAttack'),
            value: 'multiAttack',
         },
         {
            label: localize('skill'),
            value: 'skill',
         },
      ],
      casting: [
         {
            label: localize('attribute'),
            value: 'attribute',
         },
         {
            label: localize('customTrait'),
            value: 'customTrait',
         },
         {
            label: localize('skill'),
            value: 'skill',
         },
         {
            label: localize('spellTradition'),
            value: 'spellTradition',
         },
      ],
      item: [
         {
            label: localize('attribute'),
            value: 'attribute',
         },
         {
            label: localize('customTrait'),
            value: 'customTrait',
         },
         {
            label: localize('skill'),
            value: 'skill',
         },
      ],
   };

   // Update selector when check type changes
   function onCheckTypeChange() {
      switch (element.checkType) {
         case 'resistance': {
            element.selector = '';
            element.key = 'reflexes';
            break;
         }
         default: {
            element.selector = 'attribute';
            break;
         }
      }

      onSelectorChange();
   }

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
         case 'attribute': {
            element.key = 'body';
            break;
         }
         case 'customTrait':
         case 'multiAttack': {
            element.key = '';
            break;
         }
         case 'skill': {
            element.key = 'arcana';
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
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'customTrait': {
            return DocumentTextInput;
         }
         case 'skill': {
            return DocumentSkillSelect;
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

{#if element && element.operation === 'rollMessage'}
   <div class="element" transition:slide|local>
      <!--Main header-->
      <div class="header">
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

            <!--Type-->
            <div class="field select">
               <DocumentSelect
                  options={checkTypeOptions}
                  bind:value={element.checkType}
                  on:change={onCheckTypeChange}
               />
            </div>

            {#if element.checkType !== 'resistance'}
               <!--Selector-->
               <div class="field select">
                  <DocumentSelect
                     options={selectorOptions[element.checkType]}
                     bind:value={element.selector}
                     on:change={onSelectorChange}
                  />
               </div>
            {/if}

            <!--Key-->
            {#if element.selector !== 'multiAttack'}
               {#if element.checkType !== 'resistance'}
                  <div class="field select">
                     <svelte:component
                        this={getSelector()}
                        bind:value={element.key}
                     />
                  </div>
               {:else}
                  <div class="field select">
                     <DocumentResistanceSelect bind:value={element.key} />
                  </div>
               {/if}
            {/if}
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
      <!--Message text-->
      <div class="message" transition:slide|local>
         <DocumentBoundEditorInput bind:value={element.message} />
      </div>
   </div>
{/if}

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .element {
      @include flex-column;
      @include flex-group-top-left;
      @include border;
      @include panel-1;
      width: 100%;
      height: 100%;

      .header {
         @include flex-row;
         width: 100%;

         .settings {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
            margin-bottom: 0.5rem;
            flex-wrap: wrap;

            .field {
               @include flex-row;
               margin: 0.5rem 0.25rem 0 0.25rem;

               &.select {
                  @include flex-group-left;
               }
            }
         }

         .delete-button {
            @include flex-column;
            @include flex-group-top;
            margin: 0.25rem 0.25rem 0 0;
         }
      }

      .message {
         @include flex-column;
         margin-top: 0.25rem;
         width: 100%;
         min-height: 10rem;
         height: 100%;
      }
   }
</style>
