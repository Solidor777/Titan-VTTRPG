<script>
   import ChatMessageArmor from '~/document/types/chat-message/components/resources/ChatMessageArmor.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import RepairsReportChatMessageHeader
      from '~/document/types/chat-message/report/types/repairs/RepairsReportChatMessageHeader.svelte';

   /** @type object Header component to use. */
   const header = RepairsReportChatMessageHeader;

   /** @type {object|string[]} Calculated section components. */
   const sections = [ChatMessageArmor];
</script>

<ReportChatMessageBase {header} {sections}/>
