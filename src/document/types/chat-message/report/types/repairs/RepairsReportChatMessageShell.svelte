<script>
   import ChatMessageArmor from '~/document/types/chat-message/components/resources/ChatMessageArmor.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import RepairsReportChatMessageHeader
      from '~/document/types/chat-message/report/types/repairs/RepairsReportChatMessageHeader.svelte';

   /** @type {object} The header Svelte component to render. */
   const header = RepairsReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [ChatMessageArmor];
</script>

<ReportChatMessageBase {header} {sections}/>
