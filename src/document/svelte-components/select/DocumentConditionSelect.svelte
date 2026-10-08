<script>
   import { getContext } from 'svelte';
   import ConditionSelect from '~/helpers/svelte-components/input/select/ConditionSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentConditionSelectProps
    * @property {string} [value] - The value that this input should modify (a condition id).
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string} [testId] - Optional stable selector forwarded to the select's trigger.
    */

   /** @type {DocumentConditionSelectProps} */
   let {
      value = $bindable(),
      disabled = false,
      tooltip = void 0,
      testId = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ConditionSelect
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {testId}
   {tooltip}
/>
