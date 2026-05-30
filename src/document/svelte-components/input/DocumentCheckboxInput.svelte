<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentCheckboxInputProps
    * @property {boolean} [value] - The boolean value to bind to.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {boolean} [disabled] - Whether editing this input should be disabled.
    */

   /** @type {DocumentCheckboxInputProps} */
   let {
      value = $bindable(void 0),
      tooltip = void 0,
      disabled = false,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CheckboxInput
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {tooltip}
/>
