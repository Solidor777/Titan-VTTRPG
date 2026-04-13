<script>
   import { getContext } from 'svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/input/select/CheckDifficultySelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {number} - The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} - Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CheckDifficultySelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={()=> refreshSystemDocument($document, disabled)}
   {tooltip}
/>
