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
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import {getContext} from 'svelte';
   import TurnEndReportChatMessageHeader
      from '~/document/types/chat-message/report/types/turn-end/TurnEndReportChatMessageHeader.svelte';
   import ChatMessageRemoveExpiredEffectsButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRemoveExpiredEffectsButton.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Header svelte-components to use. */
   const header = TurnEndReportChatMessageHeader;

   /** @type {object|string[]} Calculated section svelte-components. */
   const sections = [];

   // Add Stamina if appropriate
   if ($document.flags.titan.stamina) {
      sections.push(ChatMessageStamina);
   }

   // Add Wounds if appropriate
   if ($document.flags.titan.wounds) {
      sections.push(ChatMessageWounds);
   }

   // Cache whether the report has expired effects
   const hasExpiredEffects = !!$document.flags.titan.effects?.expired;

   // Add expired effects
   if (hasExpiredEffects) {
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
   }

   // Add fast healing information if appropriate
   if ($document.flags.titan.fastHealing) {

      // Add fast healing Tag if confirmed
      if ($document.flags.titan.fastHealing.confirmed) {
         sections.push(ChatMessageFastHealingTag);
      }

      // Otherwise, add apply fast healing button
      else {
         sections.push(ChatMessageApplyFastHealingButton);
      }
   }

   // Add fast persistent damage information if appropriate
   if ($document.flags.titan.persistentDamage) {

      // Add persistent damage Tag if confirmed
      if ($document.flags.titan.persistentDamage.confirmed) {
         sections.push(ChatMessagePersistentDamageTag);
      }

      // Otherwise, add apply persistent damage button
      else {
         sections.push(ChatMessageApplyPersistentDamageButton);
      }
   }

   // Add messages if appropriate
   if ($document.flags.titan.message) {
      sections.push({
         component: ChatMessageRichTextMessages,
         isRichText: true,
      });
   }

</script>

<ReportChatMessageBase {header} {sections}/>
