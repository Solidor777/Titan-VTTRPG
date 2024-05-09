<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import { RESOLVE_ICON } from '~/system/Icons.js';

   /** @type ChatMessage Reference to the Chat Message document */
   const document = getContext('document');
</script>

<ChatResource
   icon={RESOLVE_ICON}
   label={localize('resolve')}
   value={$document.flags.titan.resolve.value}
   max={$document.flags.titan.resolve.max}
/>
