<script>
   import { getContext } from 'svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';

   /**
    * @typedef {object} DocumentOwnerButtonProps
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    * @property {import('svelte').Snippet} [children] - Content to render inside the button.
    */

   /** @type {DocumentOwnerButtonProps} */
   let {
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<Button disabled={disabled || !document.data.isOwner} {onclick} {tooltip}>
   {@render children?.()}
</Button>
