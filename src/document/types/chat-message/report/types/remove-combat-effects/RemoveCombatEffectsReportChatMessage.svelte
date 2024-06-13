<script>
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import RemoveCombatEffectsReportChatMessageHeader
      from '~/document/types/chat-message/report/types/remove-combat-effects/RemoveCombatEffectsReportChatMessageHeader.svelte';
   import ReportChatMessageResolveRestoredMessage
      from '~/document/types/chat-message/components/messages/ChatMessageResolveRestoredMessage.svelte';

   /** @type object Header svelte-components to use. */
   const header = RemoveCombatEffectsReportChatMessageHeader;

   /** @type {object|string[]} Calculated section svelte-components. */
   const sections = [ReportChatMessageResolveRestoredMessage];
</script>

<ReportChatMessageBase {header} {sections}/>
