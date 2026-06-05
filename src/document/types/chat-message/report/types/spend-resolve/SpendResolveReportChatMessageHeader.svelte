<script>
   import ReportChatMessageHeader from '~/document/types/chat-message/report/components/ReportChatMessageHeader.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SPEND_RESOLVE_ICON } from '~/system/Icons.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Localized title text shown at the top of the report card. */
   const headerLabel = localize(
      document.data.system.resolveShortage
         ? 'attemptedToSpendX%Resolve'
         : 'spentX%Resolve',
   ).replace('X%', document.data.system.resolveSpent);
</script>

<ReportChatMessageHeader
   headerIcon={SPEND_RESOLVE_ICON}
   headerLabel={headerLabel}
   images={[document.data.system.actorImg]}
   subHeaderLabels={[document.data.system.actorName]}
/>
