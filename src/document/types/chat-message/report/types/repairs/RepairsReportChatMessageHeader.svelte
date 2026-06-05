<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REPAIR_ICON } from '~/system/Icons.js';
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
   const headerLabel = localize('repairedX%Armor').replace(
      'X%',
      document.data.system.armorRepaired,
   );
</script>

<ChatReportHeader
   headerIcon={REPAIR_ICON}
   {headerLabel}
   {images}
   {subHeaderLabels}
/>
