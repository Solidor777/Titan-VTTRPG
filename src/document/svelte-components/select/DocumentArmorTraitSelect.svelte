<script>
   import { getContext } from 'svelte';
   import ArmorTraitSelect from '~/helpers/svelte-components/input/select/ArmorTraitSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentArmorTraitSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentArmorTraitSelectProps} */
   let {
      value = $bindable(void 0),
      allowNone = false,
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ArmorTraitSelect
   {allowNone}
   bind:value
   disabled={disabled || !$document?.isOwner}
   onchange={() => refreshSystemDocument($document, disabled)}
   {tooltip}
/>
