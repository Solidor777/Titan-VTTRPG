<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';

   /**
    * @typedef {object} ItemSheetConditionalCheckModifierSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetConditionalCheckModifierSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

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
         label: 'anyCheck',
         value: 'any',
      },
      {
         label: 'attackCheck',
         value: 'attack',
      },
      {
         label: 'castingCheck',
         value: 'casting',
      },
      {
         label: 'itemCheck',
         value: 'item',
      },
   ];

   /**
    * @type {{label: string, value: string}[]}
    * Check type options when healing is selected. Excludes attack checks, because attacks cannot heal.
    */
   const healingCheckTypeOptions = [
      {
         label: 'anyCheck',
         value: 'any',
      },
      {
         label: 'castingCheck',
         value: 'casting',
      },
      {
         label: 'itemCheck',
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
    * resets the check type to 'any' and cascades the change to the selector.
    * @returns {void}
    */
   function onModifierTypeChanged() {
      if (
         document.data.system.rulesElement[idx].modifierType === 'healing' &&
         document.data.system.rulesElement[idx].checkType === 'attack'
      ) {
         document.data.system.rulesElement[idx].checkType = 'any';
         if (onCheckTypeChange() !== true) {
            document.data.update({
               system: structuredClone(document.data.system),
            });
         }
      }
   }

   /**
    * Updates the selector when the check type changes.
    * Resets the selector to 'any' unless it is 'customTrait', 'attribute', or a valid 'skill' selector.
    * @returns {boolean} Whether a document update was triggered.
    */
   function onCheckTypeChange() {
      if (
         document.data.system.rulesElement[idx].selector !== 'customTrait' &&
         document.data.system.rulesElement[idx].selector !== 'attribute' &&
         !(document.data.system.rulesElement[idx].checkType !== 'any' &&
           document.data.system.rulesElement[idx].selector === 'skill')
      ) {
         document.data.system.rulesElement[idx].selector = 'any';
         onSelectorChange();

         return true;
      }

      return false;
   }

   /**
    * Updates the element key to a default value when the selector changes, then triggers a document update.
    */
   function onSelectorChange() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            document.data.system.rulesElement[idx].key = 'body';
            break;
         }
         case 'attackTrait': {
            document.data.system.rulesElement[idx].key = 'blast';
            break;
         }
         case 'attackType': {
            document.data.system.rulesElement[idx].key = 'melee';
            break;
         }
         case 'customTrait':
         case 'multiAttack': {
            document.data.system.rulesElement[idx].key = '';
            break;
         }
         case 'skill': {
            document.data.system.rulesElement[idx].key = 'arcana';
            break;
         }
         case 'spellTradition': {
            document.data.system.rulesElement[idx].key = localize('any');
            break;
         }
         default: {
            break;
         }
      }

      document.data.update({
         system: structuredClone(document.data.system),
      });
   }

   /**
    * Returns the appropriate Svelte component for the current selector type.
    * @returns {object | undefined} The selector input component, or undefined if there is no valid case.
    */
   function getSelector() {
      switch (document.data.system.rulesElement[idx].selector) {
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

<!--Operation Settings-->
<div class="settings">

   <!--Modifier Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].modifierType}
         onchange={onModifierTypeChanged}
         options={modifierTypeOptions}
      />
   </div>

   <!--Check Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].checkType}
         onchange={onCheckTypeChange}
         options={document.data.system.rulesElement[idx].modifierType === 'healing'
                  ? healingCheckTypeOptions
                  : checkTypeOptions}
      />
   </div>

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={selectorOptions[document.data.system.rulesElement[idx].checkType]}
      />
   </div>

   <!--Key-->
   {#if document.data.system.rulesElement[idx].selector !== 'any'}
      <div class="field select">
         {#if getSelector()}
            {@const Selector = getSelector()}
            <Selector bind:value={document.data.system.rulesElement[idx].key}/>
         {/if}
      </div>
   {/if}

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={document.data.system.rulesElement[idx].value}/>
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
