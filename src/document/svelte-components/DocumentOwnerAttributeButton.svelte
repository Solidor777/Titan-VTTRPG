<script>
   import { getContext } from 'svelte';
   import AttributeButton from '~/helpers/svelte-components/button/AttributeButton.svelte';

   /** @type {string} The Attribute that this component represents. */
   export let attribute;

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

<AttributeButton {attribute} disabled={disabled || !$document.isOwner} on:click {tooltip}>
   <slot/>
</AttributeButton>
