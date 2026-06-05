<script>
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import ChatMessageResolveRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageResolveRestoredMessage.svelte';
   import ChatMessageStaminaRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageStaminaRestoredMessage.svelte';
   import LongRestReportChatMessageHeader
      from '~/document/types/chat-message/report/types/long-rest/LongRestReportChatMessageHeader.svelte';
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = LongRestReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [
      ChatMessageResolveRestoredMessage,
      ChatMessageStaminaRestoredMessage,
   ];

   // Add wounds to the messages if appropriate.
   if (document.data.system.woundsHealed) {
      sections.push(localize('healedX%Wounds').replace('X%', document.data.system.woundsHealed));
      sections.push(ChatMessageWounds);
   }
</script>

<ReportChatMessageBase {header} {sections}/>
