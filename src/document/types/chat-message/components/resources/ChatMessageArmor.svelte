<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import { ARMOR_ICON } from '~/system/Icons.js';

   /** @type ChatMessage Reference to the Chat Message document */
   const document = getContext('document');
</script>

<ChatResource
   icon={ARMOR_ICON}
   label={localize('armor')}
   value={$document.flags.titan.armor.value}
   max={$document.flags.titan.armor.max}
/>
