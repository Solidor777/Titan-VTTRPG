<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SPEND_RESOLVE_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type string Calculated header label. */
   const headerLabel = localize(
      $document.flags.titan.resolveShortage
         ? 'attemptedToSpendX%Resolve'
         : 'spentX%Resolve',
   ).replace('X%', $document.flags.titan.resolveSpent);

</script>

<ReportChatMessageHeader
   headerLabel="{headerLabel}"
   headerIcon="{SPEND_RESOLVE_ICON}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
   images="{[$document.flags.titan.actorImg]}"
/>
