<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { TURN_START_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

</script>

<ReportChatMessageHeader
   headerLabel="{localize('turnStart')}"
   headerIcon="{TURN_START_ICON}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
   images="{[$document.flags.titan.actorImg]}"
/>
