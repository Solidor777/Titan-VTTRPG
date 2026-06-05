<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import { ARMOR_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ChatResource
   icon={ARMOR_ICON}
   label={localize('armor')}
   max={document.data.system.armor.max}
   value={document.data.system.armor.value}
/>
