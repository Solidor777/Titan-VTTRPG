<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {REMOVE_TEMP_EFFECTS_ICON} from '~/system/Icons.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string Header label. */
   const headerLabel = localize('combatEffectsRemoved');

</script>

<ReportChatMessageHeader
   headerIcon="{REMOVE_TEMP_EFFECTS_ICON}"
   {headerLabel}
   images="{[$document.flags.titan.actorImg]}"
   subHeaderLabels="{[$document.flags.titan.actorName]}"
/>
