<script>
   import ChatMessageResolve from '~/document/types/chat-message/components/resources/ChatMessageResolve.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import SpendResolveReportChatMessageHeader
      from '~/document/types/chat-message/report/types/spend-resolve/SpendResolveReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Header svelte-components to use. */
   const header = SpendResolveReportChatMessageHeader;

   /** @type {object|string[]} Calculated section svelte-components. */
   const sections = [ChatMessageResolve];

   // Add resolve shortage message if appropriate.
   if ($document.flags.titan.resolveShortage) {
      sections.unshift(localize('needX%MoreResolve').replace('X%', $document.flags.titan.resolveShortage));
   }
</script>

<ReportChatMessageBase {header} {sections}/>
