<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SHORT_REST_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Localized title text shown at the top of the report card. */
   const headerLabel = localize('tookAShortRest');
</script>

<ReportChatMessageHeader
   headerIcon={SHORT_REST_ICON}
   {headerLabel}
   images={[document.data.flags.titan.actorImg]}
   subHeaderLabels={[document.data.flags.titan.actorName]}
/>
