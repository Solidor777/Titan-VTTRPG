<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentTextInputProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentTextInputProps} */
   let {
      value = $bindable(void 0),
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

<TextInput
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={updateDocument}
   onkeyup={updateDocument}
   {tooltip}
/>
