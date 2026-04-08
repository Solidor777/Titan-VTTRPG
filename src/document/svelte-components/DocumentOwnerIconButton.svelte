<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { getContext } from 'svelte';

   /** @type {boolean} - The icon to display for this button. */
   export let icon = void 0;

   /** @type {boolean} - Whether this input is disabled. */
   export let disabled = false;

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');
</script>

<IconButton disabled={disabled || !$document.isOwner} {icon} on:click {tooltip}/>
