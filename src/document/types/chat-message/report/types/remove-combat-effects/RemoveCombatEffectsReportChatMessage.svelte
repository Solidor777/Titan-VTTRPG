<script>
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import RemoveCombatEffectsReportChatMessageHeader
      from '~/document/types/chat-message/report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessageHeader.svelte';
   import ReportChatMessageResolveRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageResolveRestoredMessage.svelte';

   /** @type {object} The header Svelte component to render. */
   const header = RemoveCombatEffectsReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [ReportChatMessageResolveRestoredMessage];
</script>

<ReportChatMessageBase {header} {sections}/>
