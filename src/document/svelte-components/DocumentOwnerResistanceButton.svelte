<script>
   import { getContext } from 'svelte';
   import ResistanceButton from '~/helpers/svelte-components/button/ResistanceButton.svelte';

   /** @type {string} The Resistance that this component represents. */
   export let resistance;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

</script>

<ResistanceButton disabled={disabled || !$document.isOwner} on:click {resistance} {tooltip}>
   <slot/>
</ResistanceButton>
