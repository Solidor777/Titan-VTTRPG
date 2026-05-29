<script>
   import RaritySelect from '~/helpers/svelte-components/input/select/RaritySelect.svelte';
   import { getContext } from 'svelte';
   import resolveObjectPath from '~/helpers/utility-functions/ResolveObjectPath.js';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type {string} Path to the value that this input should modify. */
   export let path = 'system.rarity';

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Input value. */
   let value = resolveObjectPath($document, path);
</script>

<RaritySelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   onchange={()=> refreshSystemDocument($document, disabled)}
   {tooltip}
/>
