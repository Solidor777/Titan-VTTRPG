<script>
   import { getContext } from 'svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';
   import ArmorTraitSelect from '~/helpers/svelte-components/input/select/ArmorTraitSelect.svelte';

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

<ArmorTraitSelect
   {allowNone}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={()=> refreshSystemDocument($document, disabled)}
   {tooltip}
/>
