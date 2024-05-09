<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import ReportChatMessageIconMessage
      from '~/document/types/chat-message/components/messages/ChatMessageIconMessage.svelte';
   import { REMOVE_TEMP_EFFECTS_ICON } from '~/system/Icons.js';

   /** @type string The message to display. */
   const message = localize('expiredEffectsRemoved');
</script>

<ReportChatMessageIconMessage
   {message}
   icon="{REMOVE_TEMP_EFFECTS_ICON}"
/>
