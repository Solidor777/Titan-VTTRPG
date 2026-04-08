<script>
   import { getContext } from 'svelte';
   import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {number} - The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} - The minimum value of the input. */
   export let min = false;

   /** @type {number|boolean} - The maximum value of the input. */
   export let max = false;

   /** @type {boolean} - Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {boolean} - Whether the input should be an Integer. If False, it will be a Float. */
   export let isInteger = false;

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /**
    * Update the document data when the input changes.
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
   on:change={updateDocument}
   on:keyup={updateDocument}
   {tooltip}
/>
