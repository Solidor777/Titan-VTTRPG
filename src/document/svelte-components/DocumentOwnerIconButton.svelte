<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';

   /**
    * @typedef {object} DocumentOwnerIconButtonProps
    * @property {string} [icon] - The icon class to display for this button.
    * @property {boolean} [disabled] - Whether this input is disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    */

   /** @type {DocumentOwnerIconButtonProps} */
   let {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<IconButton disabled={disabled || !document.data.isOwner} {icon} {onclick} {tooltip}/>
