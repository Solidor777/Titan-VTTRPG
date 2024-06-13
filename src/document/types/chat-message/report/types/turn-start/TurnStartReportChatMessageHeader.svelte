<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {TURN_START_ICON} from '~/system/Icons.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

</script>

<ReportChatMessageHeader
   headerIcon="{TURN_START_ICON}"
   headerLabel="{localize('turnStart')}"
   images="{[$document.flags.titan.actorImg]}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
/>
