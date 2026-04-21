<script>
   import ChatMessageButton
      from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type {string} The CSS class for the icon to display on the button. */
   export let icon = void 0;

   /** @type {string} The computed label text for the button. */
   export let label = void 0;

   /** @type {string|undefined} The computed tooltip HTML for the button, or undefined for no tooltip. */
   export let tooltip = void 0;

   /** @type {Function} The async function to call when the button is confirmed. */
   export let confirmFn = void 0;
</script>

<ChatMessageButton on:click={() => confirmFn()} {tooltip}>
   <i class={icon}/>
   {label}
</ChatMessageButton>
