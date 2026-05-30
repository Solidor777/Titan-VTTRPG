<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentBoundEditorInput from '~/document/svelte-components/input/DocumentBoundEditorInput.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /**
    * @typedef {object} ItemSheetRollMessageSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetRollMessageSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Rules Element object. */
   const element = $derived(document.data?.system.rulesElement[idx]);

   /** @type {{label: string, value: string}[]} Options for the type of check that triggers the roll message. */
   const checkTypeOptions = [
      {
         label: 'anyCheck',
         value: 'any',
      },
      {
         label: 'attributeCheck',
         value: 'attribute',
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
      {
         label: 'resistanceCheck',
         value: 'resistance',
      },
   ];

   /** @type {Record<string, string[]>} Selector options keyed by check type. */
   const selectorOptions = {
      any: [
         'any',
         'attribute',
         'customTrait',
         'skill',
      ],
      attribute: [
         'any',
         'attribute',
         'skill',
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
         'skill',
         'spellTradition',
      ],
      item: [
         'any',
         'attribute',
         'customTrait',
         'skill',
      ],
      resistance: [
         'any',
         'resistance',
      ],
   };

   /**
    * Resets the selector to 'any' when the check type changes.
    * @returns {void}
    */
   function onCheckTypeChange() {
      element.selector = 'any';

      onSelectorChange();
   }

   /**
    * Updates the element key to a sensible default when the selector changes.
    */
   function onSelectorChange() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
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

         document.data.update({
            system: structuredClone(document.data.system),
         });
      }
   }

   /**
    * Returns the appropriate select component for the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
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

<!--Operation settings-->
<div class="settings">

   <!--Operation Fields-->
   <div class="fields">

      <!--Type-->
      <div class="field select">
         <DocumentSelect
            bind:value={document.data.system.rulesElement[idx].checkType}
            onchange={onCheckTypeChange}
            options={checkTypeOptions}
         />
      </div>

      <!--Selector-->
      <div class="field select">
         <DocumentSelect
            bind:value={document.data.system.rulesElement[idx].selector}
            onchange={onSelectorChange}
            options={selectorOptions[element.checkType]}
         />
      </div>

      <!--Key-->
      {#if element.selector !== 'multiAttack'
      && element.selector !== 'any'}
         <div class="field select">
            {#if getSelector()}
               {@const Selector = getSelector()}
               <Selector bind:value={document.data.system.rulesElement[idx].key}/>
            {/if}
         </div>
      {/if}
   </div>

   <!--Message text-->
   <div class="message">
      <DocumentBoundEditorInput
         bind:value={document.data.system.rulesElement[idx].message}
      />
   </div>
</div>

<style lang="scss">
   .settings {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .fields {
         @include tag-container;
         @include flex-group-left;

         .field {
            @include flex-row;
            @include flex-group-left;
         }
      }

      .message {
         @include flex-row;
         @include flex-group-left;
      }
   }
</style>
