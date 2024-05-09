<script>
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import ReportChatMessageResolveRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageResolveRestoredMessage.svelte';
   import ShortRestReportChatMessageHeader
      from '~/document/types/chat-message/report/types/short-rest-report/ShortRestReportChatMessageHeader.svelte';
   import ReportChatMessageStaminaRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageStaminaRestoredMessage.svelte';

   /** @type object Header component to use. */
   const header = ShortRestReportChatMessageHeader;

   /** @type {object|string[]} Calculated section components. */
   const sections = [
      ReportChatMessageResolveRestoredMessage,
      ReportChatMessageStaminaRestoredMessage,
   ];
</script>

<ReportChatMessageBase {header} {sections}/>
