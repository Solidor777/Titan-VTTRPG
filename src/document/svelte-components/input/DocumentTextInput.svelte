<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /**
    * Update the document data when the input changes.
    */
   function updateDocument() {
      refreshSystemDocument($document, disabled);
   }
</script>

<TextInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={updateDocument}
   on:keyup={updateDocument}
   {tooltip}
/>
