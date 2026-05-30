<script>
   import { getContext } from 'svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentSelectProps
    * @property {*} [value] - The value that this input should modify.
    * @property {(import('~/helpers/svelte-components/input/select/Select.svelte').SelectOption | string | number)[]} [options] - Options for the Select component.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentSelectProps} */
   let {
      value = $bindable(void 0),
      options = void 0,
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<Select
   bind:value
   disabled={disabled || !$document?.isOwner}
   onchange={() => refreshSystemDocument($document, disabled)}
   {options}
   {tooltip}
/>
