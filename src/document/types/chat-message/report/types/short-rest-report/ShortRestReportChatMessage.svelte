<script>
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import ReportChatMessageResolveRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageResolveRestoredMessage.svelte';
   import ShortRestReportChatMessageHeader
      from '~/document/types/chat-message/report/types/short-rest-report/ShortRestReportChatMessageHeader.svelte';
   import ReportChatMessageStaminaRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageStaminaRestoredMessage.svelte';

   /** @type {object} The header Svelte component to render. */
   const header = ShortRestReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [
      ReportChatMessageResolveRestoredMessage,
      ReportChatMessageStaminaRestoredMessage,
   ];
</script>

<ReportChatMessageBase {header} {sections}/>
