<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { RESET_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ReportChatMessageHeader
   headerIcon={RESET_ICON}
   headerLabel={localize('turnStartRevert')}
   images={[document.data.system.actorImg]}
   subHeaderLabels={[document.data.system.actorName]}
/>
