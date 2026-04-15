<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Rules Element object. */
   let element;
   $: element = $document?.system.rulesElement[idx];

   /** @type {string[]} Options for the type of value the modifier applies to. */
   const modifierTypeOptions = [
      'damage',
      'dice',
      'expertise',
      'training',
      'healing',
   ];

   /** @type {{label: string, value: string}[]} Options for the type of check the modifier applies to. */
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

   /**
    * @type {{label: string, value: string}[]}
    * Check type options when healing is selected. Excludes attack checks,
    * because attacks cannot heal.
    */
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

   /** @type {Record<string, string[]>} Selector options keyed by check type. */
   const selectorOptions = {
      any: [
         'any',
         'attribute',
         'skill',
         'customTrait',
      ],
      attack: [
         'any',
         'attribute',
         'attackTrait',
         'attackType',
         'customTrait',
         'multiAttack',
         'skill',
      ],
      casting: [
         'any',
         'attribute',
         'customTrait',
         'spellTradition',
         'skill',
      ],
      item: [
         'any',
         'attribute',
         'customTrait',
         'skill',
      ],
   };

   /**
    * Updates the check type if necessary when the modifier type changes.
    * If the modifier type is 'healing' and the check type is 'attack',
    * resets the check type to 'any' and cascades the change to the
    * selector.
    * @returns {void}
    */
   function onModifierTypeChanged() {
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

   /**
    * Updates the selector when the check type changes.
    * Resets the selector to 'any' unless it is 'customTrait', 'attribute', or a
    * valid 'skill' selector.
    * @returns {boolean} Whether a document update was triggered.
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

   /**
    * Updates the element key to a default value when the selector changes,
    * then triggers a document update.
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
    * Returns the appropriate Svelte component for the current selector type.
    * @returns {object | undefined} The selector input component, or undefined
    *    if there is no valid case.
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
            <ItemSheetRulesElementOperationSelect {idx}/>
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
         margin-bottom: var(--titan-spacing-large);

         .field {
            @include flex-row;

            margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0;

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
         margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 0;
      }
   }
</style>
