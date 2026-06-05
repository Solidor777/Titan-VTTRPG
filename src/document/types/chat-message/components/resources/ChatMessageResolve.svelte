<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatResource from '~/document/types/chat-message/components/resources/ChatMessageResource.svelte';
   import { RESOLVE_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ChatResource
   icon={RESOLVE_ICON}
   label={localize('resolve')}
   max={document.data.system.resolve.max}
   value={document.data.system.resolve.value}
/>
