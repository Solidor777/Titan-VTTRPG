<script>
   import ChatMessageButton
      from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /**
    * @typedef {object} ChatMessageResourceModButtonProps
    * @property {string} [icon] The CSS class for the icon to display on the button.
    * @property {string} [label] The computed label text for the button.
    * @property {string} [tooltip] The computed tooltip HTML for the button, or undefined for no tooltip.
    * @property {Function} [confirmFn] The async function to call when the button is confirmed.
    */

   /** @type {ChatMessageResourceModButtonProps} */
   const { icon = void 0, label = void 0, tooltip = void 0, confirmFn = void 0 } = $props();
</script>

<ChatMessageButton onclick={() => confirmFn()} {tooltip}>
   <i class={icon}/>
   {label}
</ChatMessageButton>
