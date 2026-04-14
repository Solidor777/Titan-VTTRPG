<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { getContext } from 'svelte';

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /**
    * @type {string|TooltipAction}
    * The Tooltip to display for this element, if any.
    */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

</script>

<Button disabled={disabled || !$document.isOwner} on:click {tooltip}>
   <slot/>
</Button>
