<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_ICON, DAMAGE_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type string Calculated header label. */
   let headerLabel;

   /** @type string Calculated header icon. */
   let headerIcon;

   // If we tool damage, use that as the main header
   if ($document.flags.titan.damageTaken) {
      headerLabel = localize('tookX%Damage').replace('X%', $document.flags.titan.damageTaken);
      headerIcon = DAMAGE_ICON;
   }

   // Otherwise, we resisted all damage, and should use that as the main header
   else {
      headerLabel = localize('resistedX%Damage').replace('X%', $document.flags.titan.damageResisted);
      headerIcon = ARMOR_ICON;
   }

</script>

<ReportChatMessageHeader
   headerLabel="{headerLabel}"
   headerIcon="{headerIcon}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
   images="{[$document.flags.titan.actorImg]}"
/>
