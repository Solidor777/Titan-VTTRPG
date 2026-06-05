<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_ICON, REND_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Actor and armor images. */
   const images = [
      document.data.system.actorImg,
      document.data.system.armorImg,
   ];

   /** @type {string[]} Actor and armor names. */
   const subHeaderLabels = [
      document.data.system.actorName,
      [document.data.system.armorName],
   ];

   /** @type {string} Calculated main label for the header. */
   let headerLabel;

   /** @type {string} Font-icon class shown beside the report's title. */
   let headerIcon;

   // If armor was lost, update the header label and icon to show that the armor was damaged.
   if (document.data.system.armorLost) {
      headerLabel = localize('lostX%Armor').replace(
         'X%',
         document.data.system.armorLost,
      );
      headerIcon = REND_ICON;
   }

   // Otherwise, show the amount of rend that was resisted (the full rend, since no armor was lost).
   else {
      headerLabel = localize('resistedX%Rend').replace(
         'X%',
         document.data.system.rend,
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
