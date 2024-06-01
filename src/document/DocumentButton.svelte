<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {getContext} from 'svelte';

   /** @type boolean Whether this button is disabled. */
   export let disabled = false;

   /** @type boolean Tooltip for this button, if any. */
   export let tooltip = void 0;

   /** @type Document Reference to the Document this Application is for. */
   const document = getContext('document');

</script>

<Button disabled={disabled || !$document.isOwner} on:click {tooltip}>
   <slot/>
</Button>
