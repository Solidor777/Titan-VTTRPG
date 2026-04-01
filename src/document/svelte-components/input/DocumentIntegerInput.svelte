<script>
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {number} The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value for this input, or false if there is none. */
   export let min = false;

   /** @type {number|boolean} The maximum value for this input, or false if there is none. */
   export let max = false;

   /** @type {boolean} Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type {object} Reference to the Document store. */
   const document = getContext('document');

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /**
    * Update the document data when the input changes.
    */
   function updateDocument() {
      refreshSystemDocument($document, disabled);
   }
</script>

<IntegerInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   {max}
   {min}
   on:change={updateDocument}
   on:keyup={updateDocument}
   {tooltip}
/>
