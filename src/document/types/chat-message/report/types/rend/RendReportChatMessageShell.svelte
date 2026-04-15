<script>
   import ChatMessageArmor from '~/document/types/chat-message/components/resources/ChatMessageArmor.svelte';
   import RendReportChatMessageHeader
      from '~/document/types/chat-message/report/types/rend/RendReportChatMessageHeader.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = RendReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [];

   // Add wounds if appropriate
   if ($document.flags.titan.armor) {
      sections.push(ChatMessageArmor);
   }
</script>

<ReportChatMessageBase {header} {sections}/>
