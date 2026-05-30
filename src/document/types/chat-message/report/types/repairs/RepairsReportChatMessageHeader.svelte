<script>
   import ChatReportHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REPAIR_ICON } from '~/system/Icons.js';
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
   const headerLabel = localize('repairedX%Armor').replace(
      'X%',
      document.data.flags.titan.armorRepaired,
   );
</script>

<ChatReportHeader
   headerIcon={REPAIR_ICON}
   {headerLabel}
   {images}
   {subHeaderLabels}
/>
