<script>
   import { getContext } from 'svelte';
   import RaritySelect from '~/helpers/svelte-components/input/select/RaritySelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentRaritySelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentRaritySelectProps} */
   let {
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<RaritySelect
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {tooltip}
/>
