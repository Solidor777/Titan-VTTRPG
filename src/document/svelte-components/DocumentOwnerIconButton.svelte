<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { getContext } from 'svelte';

   /** @type {string} The icon class to display for this button. */
   export let icon = void 0;

   /** @type {boolean} Whether this input is disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<IconButton disabled={disabled || !$document.isOwner} {icon} on:click {tooltip}/>
