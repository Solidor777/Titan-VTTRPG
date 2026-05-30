<script>
   import { getContext } from 'svelte';
   import DamageReducedBySelect from '~/helpers/svelte-components/input/select/DamageReducedBySelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentDamageReducedBySelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowOpposedCheck] - Whether to allow Opposed Check as an option.
    * @property {boolean} [allowResistanceCheck] - Whether to allow Resistance Check as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentDamageReducedBySelectProps} */
   let {
      value = $bindable(void 0),
      allowOpposedCheck = true,
      allowResistanceCheck = true,
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<DamageReducedBySelect
   {allowOpposedCheck}
   {allowResistanceCheck}
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {tooltip}
/>
