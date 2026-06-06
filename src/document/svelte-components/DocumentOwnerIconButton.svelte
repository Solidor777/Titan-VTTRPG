<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   /**
    * @typedef {object} DocumentOwnerIconButtonProps
    * @property {string} [icon] - The icon class to display for this button.
    * @property {boolean} [disabled] - Whether this input is disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    * @property {string} label - Accessible label, forwarded to the inner IconButton.
    */

   /** @type {DocumentOwnerIconButtonProps} */
   let {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      label,
   } = $props();

   /** @type {object} The nearest document bridge ('document' context — possibly an embedded one). */
   const document = getContext('document');
</script>

<IconButton disabled={disabled || !document.data?.isOwner} {icon} {label} {onclick} {tooltip}/>
