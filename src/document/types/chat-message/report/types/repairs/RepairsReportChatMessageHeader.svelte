<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REPAIR_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type string[] Actor and armor images. */
   const images = [$document.flags.titan.actorImg, $document.flags.titan.armorImg];

   /** @type string[] Actor and armor names. */
   const subHeaderLabels = [$document.flags.titan.actorName, [$document.flags.titan.armorName]];

   /** @type string Calculated main label for the header. */
   const headerLabel = localize('repairedX%Armor').replace('X%', $document.flags.titan.armorRepaired);

</script>

<ChatReportHeader
   {headerLabel}
   headerIcon="{REPAIR_ICON}"
   {subHeaderLabels}
   {images}
/>
