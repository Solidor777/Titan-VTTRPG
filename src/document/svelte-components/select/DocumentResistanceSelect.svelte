<script>
   import { getContext } from 'svelte';
   import ResistanceSelect from '~/helpers/svelte-components/input/select/ResistanceSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentResistanceSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowAll] - Whether to allow All as an option.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentResistanceSelectProps} */
   let {
      value = $bindable(void 0),
      allowAll = false,
      allowNone = false,
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ResistanceSelect
   {allowAll}
   {allowNone}
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {tooltip}
/>
