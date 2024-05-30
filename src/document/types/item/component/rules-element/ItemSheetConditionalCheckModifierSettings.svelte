<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import onRulesElementOperationChanged
      from '~/document/types/item/component/rules-element/RulesElementUpdateOperation';
   import DocumentAttackTypeSelect from '~/document/components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import DocumentSkillSelect from '~/document/components/select/DocumentSkillSelect.svelte';
   import {DELETE_ICON} from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');

   export let operationOptions = void 0;
   export let idx = void 0;
   export let element = void 0;

   // Modifier type options
   const modifierTypeOptions = [
      {
         label: localize('damage'),
         value: 'damage',
      },
      {
         label: localize('dice'),
         value: 'dice',
      },
      {
         label: localize('expertise'),
         value: 'expertise',
      },
      {
         label: localize('training'),
         value: 'training',
      },
      {
         label: localize('healing'),
         value: 'healing',
      },
   ];

   // Check type options
   const checkTypeOptions = [
      {
         label: localize('anyCheck'),
         value: 'any',
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
   ];

   // Special case for healing because attacks cannot heal
   const healingCheckTypeOptions = [
      {
         label: localize('anyCheck'),
         value: 'any',
      },
      {
         label: localize('castingCheck'),
         value: 'casting',
      },
      {
         label: localize('itemCheck'),
         value: 'item',
      },
   ];

   // Attack Check options
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
            label: localize('skill'),
            value: 'skill',
         },
         {
            label: localize('customTrait'),
            value: 'customTrait',
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
            label: localize('spellTradition'),
            value: 'spellTradition',
         },
         {
            label: localize('skill'),
            value: 'skill',
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
   };

   // Update the check type if necessary when modifier type changes
   /**
    *
    */
   function onModifierTypeChanged() {
      if ($document?.isOwner) {
         if (
            element.modifierType === 'healing' &&
            element.checkType === 'attack'
         ) {
            element.checkType = 'any';
            if (onCheckTypeChange() !== true) {
               $document.update({
                  system: $document.system,
               });
            }
         }
      }
   }

   // Update the selector when the check type changes
   // Returns whether an update was triggered
   /**
    *
    */
   function onCheckTypeChange() {
      if (
         element &&
         element.selector !== 'customTrait' &&
         element.selector !== 'attribute' &&
         !(element.checkType !== 'any' && element.selector === 'skill')
      ) {
         element.selector = 'any';
         onSelectorChange();

         return true;
      }

      return false;
   }

   // Updates the key when the selector changes
   /**
    *
    */
   function onSelectorChange() {
      switch (element.selector) {
         case 'attribute': {
            element.key = 'body';
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

   /**
    *
    */
   function getSelector() {
      switch (element.selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'attackTrait': {
            return DocumentAttackTraitSelect;
         }
         case 'attackType': {
            return DocumentAttackTypeSelect;
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

{#if element && element.operation === 'conditionalCheckModifier'}
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

         <!--Modifier Type-->
         <div class="field select">
            <DocumentSelect
               options={modifierTypeOptions}
               bind:value={element.modifierType}
               on:change={onModifierTypeChanged}
            />
         </div>

         <!--Check Type-->
         <div class="field select">
            <DocumentSelect
               options={element.modifierType === 'healing'
                  ? healingCheckTypeOptions
                  : checkTypeOptions}
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
         {#if element.selector !== 'any'}
            <div class="field select">
               <svelte:component
                  this={getSelector()}
                  bind:value={element.key}
               />
            </div>
         {/if}

         <!--Value-->
         <div class="field number">
            <DocumentIntegerInput bind:value={element.value}/>
         </div>
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
{/if}

<style lang="scss">
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
         margin-bottom: var(--titan-padding-large);

         .field {
            @include flex-row;

            margin: var(--titan-padding-large) var(--titan-padding-standard) 0 var(--titan-padding-standard);

            &.select {
               @include flex-group-left;
            }

            &.number {
               @include flex-group-center;

               width: 32px;
            }
         }
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;

         height: 100%;
         margin: var(--titan-padding-large) var(--titan-padding-standard) 0 0;
      }
   }
</style>
