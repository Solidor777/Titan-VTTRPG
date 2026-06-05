<script>
   import ChatMessageApplyFastHealingButton
      from '~/document/types/chat-message/components/buttons/ChatMessageApplyFastHealingButton.svelte';
   import ChatMessageApplyPersistentDamageButton
      from '~/document/types/chat-message/components/buttons/ChatMessageApplyPersistentDamageButton.svelte';
   import ChatMessageExpiredEffectsTags
      from '~/document/types/chat-message/components/tags/ChatMessageExpiredEffectsTags.svelte';
   import ChatMessageExpiredEffectsRemovedMessage
      from '~/document/types/chat-message/components/messages/ChatMessageExpiredEffectsRemovedMessage.svelte';
   import ChatMessageFastHealingTag
      from '~/document/types/chat-message/components/tags/ChatMessageFastHealingTag.svelte';
   import ChatMessagePersistentDamageTag
      from '~/document/types/chat-message/components/tags/ChatMessagePersistentDamageTag.svelte';
   import ChatMessageRichTextMessages
      from '~/document/types/chat-message/components/resources/ChatMessageRichTextMessages.svelte';
   import ChatMessageStamina from '~/document/types/chat-message/components/resources/ChatMessageStamina.svelte';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import autoRemoveExpiredEffects from '~/helpers/Settings/AutoRemoveExpiredEffects.js';
   import { getContext } from 'svelte';
   import TurnEndReportChatMessageHeader
      from '~/document/types/chat-message/report/types/turn-end/TurnEndReportChatMessageHeader.svelte';
   import ChatMessageRemoveExpiredEffectsButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRemoveExpiredEffectsButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = TurnEndReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [];

   // Add Stamina if appropriate.
   if (document.data.system.stamina) {
      sections.push(ChatMessageStamina);
   }

   // Add Wounds if appropriate.
   if (document.data.system.wounds) {
      sections.push(ChatMessageWounds);
   }

   // Cache whether the report has expired effects.
   const hasExpiredEffects = !!document.data.system.effects?.expired;

   // Add expired effects.
   if (hasExpiredEffects) {
      sections.push({
         component: ChatMessageExpiredEffectsTags,
         isTags: true,
      });

      // Add message if the expired effects were removed.
      if (document.data.system.expiredEffectsRemoved === true) {
         sections.push(ChatMessageExpiredEffectsRemovedMessage);
      }

      // Otherwise, show a button if appropriate.
      else if (autoRemoveExpiredEffects() === 'showButton') {
         sections.push(ChatMessageRemoveExpiredEffectsButton);
      }
   }

   // Add fast healing information if appropriate.
   if (document.data.system.fastHealing) {

      // Add fast healing Tag if confirmed.
      if (document.data.system.fastHealing.confirmed) {
         sections.push(ChatMessageFastHealingTag);
      }

      // Otherwise, add apply fast healing button.
      else {
         sections.push(ChatMessageApplyFastHealingButton);
      }
   }

   // Add fast persistent damage information if appropriate.
   if (document.data.system.persistentDamage) {

      // Add persistent damage Tag if confirmed.
      if (document.data.system.persistentDamage.confirmed) {
         sections.push(ChatMessagePersistentDamageTag);
      }

      // Otherwise, add apply persistent damage button.
      else {
         sections.push(ChatMessageApplyPersistentDamageButton);
      }
   }

   // Add messages if appropriate. The message ArrayField has an initial [] (truthy when empty), so guard
   // on length to keep "no messages" treated as absent.
   if (document.data.system.message?.length) {
      sections.push({
         component: ChatMessageRichTextMessages,
         isRichText: true,
      });
   }
</script>

<ReportChatMessageBase {header} {sections}/>
