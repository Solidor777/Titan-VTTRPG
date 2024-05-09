<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REMOVE_TEMP_EFFECTS_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type string Header label. */
   const headerLabel = localize('combatEffectsRemoved');

</script>

<ReportChatMessageHeader
   {headerLabel}
   headerIcon="{REMOVE_TEMP_EFFECTS_ICON}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
   images="{[$document.flags.titan.actorImg]}"
/>
