<script>
   import { getContext } from 'svelte';
   import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentNumberInputProps
    * @property {number} [value] - The value that this input should modify.
    * @property {number | boolean} [min] - The minimum value of the input.
    * @property {number | boolean} [max] - The maximum value of the input.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {boolean} [isInteger] - Whether the input should be an Integer. If false, it will be a Float.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentNumberInputProps} */
   let {
      value = $bindable(void 0),
      min = false,
      max = false,
      disabled = false,
      isInteger = false,
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

<NumberInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   {isInteger}
   {max}
   {min}
   onchange={updateDocument}
   onkeyup={updateDocument}
   {tooltip}
/>
