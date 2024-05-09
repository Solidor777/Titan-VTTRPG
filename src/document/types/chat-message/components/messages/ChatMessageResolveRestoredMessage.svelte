<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { RESOLVE_ICON } from '~/system/Icons.js';
   import ReportChatMessageIconMessage
      from '~/document/types/chat-message/components/messages/ChatMessageIconMessage.svelte';

   /** @type string The message to display. */
   const message = localize('resolveFullyRestored');
</script>

<ReportChatMessageIconMessage
   {message}
   icon="{RESOLVE_ICON}"
/>
