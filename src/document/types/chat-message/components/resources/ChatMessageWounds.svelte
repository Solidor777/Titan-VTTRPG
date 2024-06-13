<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import {WOUNDS_ICON} from '~/system/Icons.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<ChatResource
   icon={WOUNDS_ICON}
   label={localize('wounds')}
   max={$document.flags.titan.wounds.max}
   value={$document.flags.titan.wounds.value}
/>
