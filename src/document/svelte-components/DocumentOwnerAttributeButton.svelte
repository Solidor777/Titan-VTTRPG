<script>
   import { getContext } from 'svelte';
   import AttributeButton from '~/helpers/svelte-components/button/AttributeButton.svelte';

   /**
    * @typedef {object} DocumentOwnerAttributeButtonProps
    * @property {string} attribute - The Attribute that this component represents.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    * @property {import('svelte').Snippet} [children] - Content to render inside the button.
    */

   /** @type {DocumentOwnerAttributeButtonProps} */
   let {
      attribute,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<AttributeButton {attribute} disabled={disabled || !document.data.isOwner} {onclick} {tooltip}>
   {@render children?.()}
</AttributeButton>
