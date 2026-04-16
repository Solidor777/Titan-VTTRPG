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
         $document.system.rulesElement[idx].modifierType === 'healing' &&
         $document.system.rulesElement[idx].checkType === 'attack'
      ) {
         $document.system.rulesElement[idx].checkType = 'any';
         if (onCheckTypeChange() !== true) {
            $document.update({
               system: structuredClone($document.system),
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
         $document.system.rulesElement[idx].selector !== 'customTrait' &&
         $document.system.rulesElement[idx].selector !== 'attribute' &&
         !($document.system.rulesElement[idx].checkType !== 'any' && element.selector === 'skill')
      ) {
         $document.system.rulesElement[idx].selector = 'any';
         onSelectorChange();

         return true;
      }

      return false;
   }

   /**
    * Updates the element key to a default value when the selector changes, then triggers a document update.
    */
   function onSelectorChange() {
      switch ($document.system.rulesElement[idx].selector) {
         case 'attribute': {
            $document.system.rulesElement[idx].key = 'body';
            break;
         }
         case 'attackTrait': {
            $document.system.rulesElement[idx].key = 'blast';
            break;
         }
         case 'attackType': {
            $document.system.rulesElement[idx].key = 'melee';
            break;
         }
         case 'customTrait':
         case 'multiAttack': {
            $document.system.rulesElement[idx].key = '';
            break;
         }
         case 'skill': {
            $document.system.rulesElement[idx].key = 'arcana';
            break;
         }
         case 'spellTradition': {
            $document.system.rulesElement[idx].key = localize('any');
            break;
         }
         default: {
            break;
         }
      }

      $document.update({
         system: structuredClone($document.system),
      });
   }

   /**
    * Returns the appropriate Svelte component for the current selector type.
    * @returns {object | undefined} The selector input component, or undefined if there is no valid case.
    */
   function getSelector() {
      switch ($document.system.rulesElement[idx].selector) {
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
         bind:value={$document.system.rulesElement[idx].modifierType}
         on:change={onModifierTypeChanged}
         options={modifierTypeOptions}
      />
   </div>

   <!--Check Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={$document.system.rulesElement[idx].checkType}
         on:change={onCheckTypeChange}
         options={$document.system.rulesElement[idx].modifierType === 'healing'
                  ? healingCheckTypeOptions
                  : checkTypeOptions}
      />
   </div>

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={$document.system.rulesElement[idx].selector}
         on:change={onSelectorChange}
         options={selectorOptions[$document.system.rulesElement[idx].checkType]}
      />
   </div>

   <!--Key-->
   {#if $document.system.rulesElement[idx].selector !== 'any'}
      <div class="field select">
         <svelte:component
            this={getSelector()}
            bind:value={$document.system.rulesElement[idx].key}
         />
      </div>
   {/if}

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={$document.system.rulesElement[idx].value}/>
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
