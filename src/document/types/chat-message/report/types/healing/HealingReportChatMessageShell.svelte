<script>
   import ChatMessageStamina from '~/document/types/chat-message/components/resources/ChatMessageStamina.svelte';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';
   import HealingReportChatMessageHeader
      from '~/document/types/chat-message/report/types/healing/HealingReportChatMessageHeader.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Header svelte-component to use. */
   const header = HealingReportChatMessageHeader;

   /** @type {object|string[]} Calculated section svelte-components. */
   const sections = [ChatMessageStamina];

   // Add wounds if appropriate
   if ($document.flags.titan.wounds) {
      sections.push(ChatMessageWounds);
   }
</script>

<ReportChatMessageBase {header} {sections}/>
