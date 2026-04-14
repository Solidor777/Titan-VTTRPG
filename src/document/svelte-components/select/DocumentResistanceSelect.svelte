<script>
   import { getContext } from 'svelte';
   import ResistanceSelect from '~/helpers/svelte-components/input/select/ResistanceSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether to allow None as an option. */
   export let allowNone = false;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string | TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ResistanceSelect
   {allowNone}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={()=> refreshSystemDocument($document, disabled)}
   {tooltip}
/>
