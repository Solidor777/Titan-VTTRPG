<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import { STAMINA_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ChatResource
   icon={STAMINA_ICON}
   label={localize('stamina')}
   max={document.data.flags.titan.stamina.max}
   value={document.data.flags.titan.stamina.value}
/>
