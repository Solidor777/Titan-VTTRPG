<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { getContext } from 'svelte';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   // Collapsed object
   export let item = void 0;

   // Reference to the docuement
   const document = getContext('document');
</script>

<IconButton
   icon={SEND_TO_CHAT_ICON}
   on:click={async () => {
      await item.sendToChat();
   }}
/>
