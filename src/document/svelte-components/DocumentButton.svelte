<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {getContext} from 'svelte';

   /** @type boolean Whether this button is disabled. */
   export let disabled = false;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

</script>

<Button disabled={disabled || !$document.isOwner} on:click {tooltip}>
   <slot/>
</Button>
