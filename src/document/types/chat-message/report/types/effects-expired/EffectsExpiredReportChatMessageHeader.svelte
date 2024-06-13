<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {DURATION_ICON} from '~/system/Icons.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

</script>

<ReportChatMessageHeader
   headerIcon="{DURATION_ICON}"
   headerLabel="{localize('effectsExpired')}"
   images="{[$document.flags.titan.actorImg]}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
/>
