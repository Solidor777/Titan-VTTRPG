<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import { STAMINA_ICON } from '~/system/Icons.js';

   /** @type ChatMessage Reference to the Chat Message document */
   const document = getContext('document');
</script>

<ChatResource
   icon={STAMINA_ICON}
   label={localize('stamina')}
   value={$document.flags.titan.stamina.value}
   max={$document.flags.titan.stamina.max}
/>
