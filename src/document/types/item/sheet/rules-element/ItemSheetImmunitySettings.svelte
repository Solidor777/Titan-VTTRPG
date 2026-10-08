<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentConditionSelect from '~/document/svelte-components/select/DocumentConditionSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import { IMMUNITY_SELECTORS } from '~/document/types/item/rules-element/Immunity.js';
   import { CONDITION_IDS } from '~/system/Conditions.js';

   /**
    * @typedef {object} ItemSheetImmunitySettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetImmunitySettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Resets the element key when the selector changes: the first condition for a condition immunity, an empty name
    * for an effect immunity.
    * @returns {void}
    */
   function onSelectorChange() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'condition': {
            document.data.system.rulesElement[idx].key = CONDITION_IDS[0];
            break;
         }
         case 'effect': {
            document.data.system.rulesElement[idx].key = '';
            break;
         }
         default: {
            break;
         }
      }
   }

   /**
    * Returns the key input for the current selector: a condition picker, or a text input for an effect name.
    * @returns {object | undefined} The input component, or undefined for an unknown selector.
    */
   function getKeyInput() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'condition': {
            return DocumentConditionSelect;
         }
         case 'effect': {
            return DocumentTextInput;
         }
         default: {
            return undefined;
         }
      }
   }
</script>

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={IMMUNITY_SELECTORS}
         testId="immunity-selector"
      />
   </div>

   <!--Key-->
   <div class="field key">
      {#if getKeyInput()}
         {@const KeyInput = getKeyInput()}
         <KeyInput
            bind:value={document.data.system.rulesElement[idx].key}
            testId="immunity-key"
         />
      {/if}
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;
         @include flex-group-left;
      }
   }
</style>
