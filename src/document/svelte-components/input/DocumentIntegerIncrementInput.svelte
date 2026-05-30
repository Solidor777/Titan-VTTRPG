<script>
   import { getContext } from 'svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentIntegerIncrementInputProps
    * @property {number} [value] - The value that this input should modify.
    * @property {number | boolean} [min] - The minimum value for this input, or false if there is none.
    * @property {number | boolean} [max] - The maximum value for this input, or false if there is none.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    * @property {number} [increment] - The increment by which to increase or decrease the value when clicking the buttons.
    * @property {number} [modifierIncrement] - The increment used when clicking the buttons while the modifier key is pressed.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentIntegerIncrementInputProps} */
   let {
      value = $bindable(void 0),
      min = false,
      max = false,
      disabled = false,
      increment = 1,
      modifierIncrement = 10,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Updates the document data when the input changes.
    * @returns {void}
    */
   function updateDocument() {
      refreshSystemDocument($document, disabled);
   }
</script>

<IntegerIncrementInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   {increment}
   {max}
   {min}
   {modifierIncrement}
   onchange={updateDocument}
   onkeyup={updateDocument}
   {tooltip}
/>
