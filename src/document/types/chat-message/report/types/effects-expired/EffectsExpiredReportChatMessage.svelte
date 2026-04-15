<script>
   import ChatMessageExpiredEffectsTags
      from '~/document/types/chat-message/components/tags/ChatMessageExpiredEffectsTags.svelte';
   import ChatMessageExpiredEffectsRemovedMessage
      from '~/document/types/chat-message/components/messages/ChatMessageExpiredEffectsRemovedMessage.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import { getContext } from 'svelte';
   import EffectsExpiredReportChatMessageHeader
      from '~/document/types/chat-message/report/types/effects-expired/EffectsExpiredReportChatMessageHeader.svelte';
   import ChatMessageRemoveExpiredEffectsButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRemoveExpiredEffectsButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = EffectsExpiredReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [];

   // Add expired effects
   sections.push({
      component: ChatMessageExpiredEffectsTags,
      isTags: true,
   });

   // Add message if the expired effects were removed
   if ($document.flags.titan.expiredEffectsRemoved === true) {
      sections.push(ChatMessageExpiredEffectsRemovedMessage);
   }

   // Otherwise, show a button if appropriate
   else if (getSetting('autoRemoveExpiredEffects') === 'showButton') {
      sections.push(ChatMessageRemoveExpiredEffectsButton);
   }
</script>

<ReportChatMessageBase {header} {sections}/>
