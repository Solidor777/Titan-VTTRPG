<script>
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentIntegerInputProps
    * @property {number} [value] - The value that this input should modify.
    * @property {number | boolean} [min] - The minimum value for this input, or false if there is none.
    * @property {number | boolean} [max] - The maximum value for this input, or false if there is none.
    * @property {number | boolean} [maxDigits] - The maximum number of digits this input can display.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentIntegerInputProps} */
   let {
      value = $bindable(void 0),
      min = false,
      max = false,
      maxDigits = false,
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Updates the document data when the input changes.
    * @returns {void}
    */
   function updateDocument() {
      refreshSystemDocument(document.data, disabled);
   }
</script>

<IntegerInput
   bind:value
   disabled={disabled || !document.data?.isOwner}
   {max}
   {maxDigits}
   {min}
   onchange={updateDocument}
   onkeyup={updateDocument}
   {tooltip}
/>
