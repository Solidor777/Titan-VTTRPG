<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_ICON, REND_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type string[] Actor and armor images. */
   const images = [$document.flags.titan.actorImg, $document.flags.titan.armorImg];

   /** @type string[] Actor and armor names. */
   const subHeaderLabels = [$document.flags.titan.actorName, [$document.flags.titan.armorName]];

   /** @type string Calculated main label for the header. */
   let headerLabel;

   /** @type string Calculated header icon. */
   let headerIcon;

   // If armor was lost, update the header label and icon to show that the armor was damaged
   if ($document.flags.titan.armorLost) {
      headerLabel = localize('lostX%Armor').replace('X%', $document.flags.titan.armorLost);
      headerIcon = REND_ICON;
   }

   // Otherwise, show that no armor was lost
   else {
      headerLabel = localize('resistedX%Rend').replace('X%', $document.flags.titan.rend);
      headerIcon = ARMOR_ICON;
   }

</script>

<ChatReportHeader
   {headerLabel}
   {headerIcon}
   {subHeaderLabels}
   {images}
/>
