<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {TURN_END_ICON} from '~/system/Icons.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

</script>

<ReportChatMessageHeader
   headerIcon="{TURN_END_ICON}"
   headerLabel="{localize('turnEnd')}"
   images="{[$document.flags.titan.actorImg]}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
/>
