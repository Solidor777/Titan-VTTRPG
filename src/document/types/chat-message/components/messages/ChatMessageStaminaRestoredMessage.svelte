<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import ReportChatMessageIconMessage
      from '~/document/types/chat-message/components/messages/ChatMessageIconMessage.svelte';
   import { STAMINA_ICON } from '~/system/Icons.js';

   /** @type string The message to display. */
   const message = localize('staminaFullyRestored');
</script>

<ReportChatMessageIconMessage
   {message}
   icon="{STAMINA_ICON}"
/>
