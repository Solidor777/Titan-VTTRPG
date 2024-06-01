<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentSkillSelect from '~/document/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import DocumentResistanceSelect from '~/document/components/select/DocumentResistanceSelect.svelte';
   import onRulesElementOperationChanged
      from '~/document/types/item/component/rules-element/OnRulesElementOperationChanged.js';
   import DocumentBoundEditorInput from '~/document/components/input/DocumentBoundEditorInput.svelte';
   import DocumentAttackTypeSelect from '~/document/components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';
   import {DELETE_ICON} from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');

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
            label: localize('any'),
            value: 'any',
         },
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
            label: localize('any'),
            value: 'any',
         },
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
            label: localize('any'),
            value: 'any',
         },
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
            label: localize('any'),
            value: 'any',
         },
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
            label: localize('any'),
            value: 'any',
         },
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
      resistance: [
         {
            label: localize('any'),
            value: 'any',
         },
         {
            label: localize('resistance'),
            value: 'resistance',
         },
      ],
   };

   // Update selector when check type changes
   /**
    *
    */
   function onCheckTypeChange() {
      element.selector = 'any';

      onSelectorChange();
   }

   // Updates the key when the selector changes
   /**
    *
    */
   function onSelectorChange() {
      if ($document?.isOwner) {
         switch (element.selector) {
            case 'any':
            case 'customTrait':
            case 'multiAttack': {
               element.key = '';
               break;
            }
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
            case 'resistance': {
               element.key = 'reflexes';
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
   }

   /**
    *
    */
   function getSelector() {
      switch (element.selector) {
         case 'attackTrait': {
            return DocumentAttackTraitSelect;
         }
         case 'attackType': {
            return DocumentAttackTypeSelect;
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
         case 'resistance': {
            return DocumentResistanceSelect;
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

            <!--Selector-->
            <div class="field select">
               <DocumentSelect
                  options={selectorOptions[element.checkType]}
                  bind:value={element.selector}
                  on:change={onSelectorChange}
               />
            </div>

            <!--Key-->
            {#if element.selector !== 'multiAttack' && element.selector !== 'any'}
               <div class="field select">
                  <svelte:component
                     this={getSelector()}
                     bind:value={element.key}
                  />
               </div>
            {/if}
         </div>

         <!--Delete Element-->
         <div class="delete-button">
            <IconButton
               icon={DELETE_ICON}
               on:click={() => {
                  $document.system.removeRulesElement(idx);
               }}
            />
         </div>
      </div>
      <!--Message text-->
      <div class="section" transition:slide|local>
         <DocumentBoundEditorInput bind:value={element.message}/>
      </div>
   </div>
{/if}

<style lang="scss">
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
            margin-bottom: var(--titan-padding-large);
            flex-wrap: wrap;

            .field {
               @include flex-row;

               margin: var(--titan-padding-large) var(--titan-padding-standard) 0 var(--titan-padding-standard);

               &.select {
                  @include flex-group-left;
               }
            }
         }

         .delete-button {
            @include flex-column;
            @include flex-group-top;

            margin: var(--titan-padding-standard) var(--titan-padding-standard) 0 0;
         }
      }

      .section {
         @include flex-column;

         margin-top: var(--titan-padding-standard);
         width: 100%;
         min-height: 160px;
         height: 100%;
      }
   }
</style>
