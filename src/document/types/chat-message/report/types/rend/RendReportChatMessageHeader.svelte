<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_ICON, REND_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Actor and armor images. */
   const images = [
      document.data.flags.titan.actorImg,
      document.data.flags.titan.armorImg,
   ];

   /** @type {string[]} Actor and armor names. */
   const subHeaderLabels = [
      document.data.flags.titan.actorName,
      [document.data.flags.titan.armorName],
   ];

   /** @type {string} Calculated main label for the header. */
   let headerLabel;

   /** @type {string} Calculated header icon. */
   let headerIcon;

   // If armor was lost, update the header label and icon to show that the armor was damaged.
   if (document.data.flags.titan.armorLost) {
      headerLabel = localize('lostX%Armor').replace(
         'X%',
         document.data.flags.titan.armorLost,
      );
      headerIcon = REND_ICON;
   }

   // Otherwise, show that no armor was lost.
   else {
      headerLabel = localize('resistedX%Rend').replace(
         'X%',
         document.data.flags.titan.rend,
      );
      headerIcon = ARMOR_ICON;
   }
</script>

<ChatReportHeader
   {headerIcon}
   {headerLabel}
   {images}
   {subHeaderLabels}
/>
