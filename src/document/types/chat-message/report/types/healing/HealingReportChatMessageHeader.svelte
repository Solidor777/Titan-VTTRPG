<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {HEALING_ICON} from '~/system/Icons.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string Main label for the header. */
   const headerLabel = localize('restoredX%Stamina').replace('X%', $document.flags.titan.staminaRestored);
</script>

<ChatReportHeader
   headerIcon="{HEALING_ICON}"
   headerLabel="{headerLabel}"
   images="{[$document.flags.titan.actorImg]}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
/>
