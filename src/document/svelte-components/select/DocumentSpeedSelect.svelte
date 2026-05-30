<script>
   import { getContext } from 'svelte';
   import SpeedSelect from '~/helpers/svelte-components/input/select/SpeedSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentSpeedSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentSpeedSelectProps} */
   let {
      value = $bindable(void 0),
      allowNone = false,
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<SpeedSelect
   {allowNone}
   bind:value
   disabled={disabled || !$document?.isOwner}
   onchange={() => refreshSystemDocument($document, disabled)}
   {tooltip}
/>
