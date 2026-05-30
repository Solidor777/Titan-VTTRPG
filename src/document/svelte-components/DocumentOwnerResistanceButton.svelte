<script>
   import { getContext } from 'svelte';
   import ResistanceButton from '~/helpers/svelte-components/button/ResistanceButton.svelte';

   /**
    * @typedef {object} DocumentOwnerResistanceButtonProps
    * @property {string} resistance - The Resistance that this component represents.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    * @property {import('svelte').Snippet} [children] - Content to render inside the button.
    */

   /** @type {DocumentOwnerResistanceButtonProps} */
   let {
      resistance,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ResistanceButton disabled={disabled || !$document.isOwner} {onclick} {resistance} {tooltip}>
   {@render children?.()}
</ResistanceButton>
