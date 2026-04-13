<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {number} - The value that this input should modify. */
   export let value = void 0;

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {boolean} - Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CheckboxInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:editor:save={() => refreshSystemDocument($document, disabled)}
   {tooltip}
/>
