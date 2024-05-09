<script>
   import ChatMessageApplyFastHealingButton
      from '~/document/types/chat-message/components/buttons/ChatMessageApplyFastHealingButton.svelte';
   import ChatMessageApplyPersistentDamageButton
      from '~/document/types/chat-message/components/buttons/ChatMessageApplyPersistentDamageButton.svelte';
   import ChatMessageApplyResolveRegainButton
      from '~/document/types/chat-message/components/buttons/ChatMessageApplyResolveRegainButton.svelte';
   import ChatMessageEffectsTags from '~/document/types/chat-message/components/tags/ChatMessageEffectsTags.svelte';
   import ChatMessageExpiredEffectsRemovedMessage
      from '~/document/types/chat-message/components/messages/ChatMessageExpiredEffectsRemovedMessage.svelte';
   import ChatMessageFastHealingTag
      from '~/document/types/chat-message/components/tags/ChatMessageFastHealingTag.svelte';
   import ChatMessagePersistentDamageTag
      from '~/document/types/chat-message/components/tags/ChatMessagePersistentDamageTag.svelte';
   import ChatMessageResolve from '~/document/types/chat-message/components/resources/ChatMessageResolve.svelte';
   import ChatMessageResolveRegainTag
      from '~/document/types/chat-message/components/tags/ChatMessageResolveRegainTag.svelte';
   import ChatMessageRichTextMessages
      from '~/document/types/chat-message/components/resources/ChatMessageRichTextMessages.svelte';
   import ChatMessageStamina from '~/document/types/chat-message/components/resources/ChatMessageStamina.svelte';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import TurnStartReportChatMessageHeader
      from '~/document/types/chat-message/report/types/turn-start/TurnStartReportChatMessageHeader.svelte';
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import { getContext } from 'svelte';
   import ChatMessageRemoveExpiredEffectsButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRemoveExpiredEffectsButton.svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type object Header component to use. */
   const header = TurnStartReportChatMessageHeader;

   /** @type {object|string[]} Calculated section components. */
   const sections = [];

   // Add Stamina if appropriate
   if ($document.flags.titan.stamina) {
      sections.push(ChatMessageStamina);
   }

   // Add Wounds if appropriate
   if ($document.flags.titan.wounds) {
      sections.push(ChatMessageWounds);
   }

   // Add Resolve if appropriate
   if ($document.flags.titan.resolve) {
      sections.push(ChatMessageResolve);
   }

   // Add effects
   if ($document.flags.titan.effects) {
      sections.push({
         component: ChatMessageEffectsTags,
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

   // Add resolve regain information if appropriate
   if ($document.flags.titan.resolveRegain) {

      // Add resolve regain Tag if confirmed
      if ($document.flags.titan.resolveRegain.confirmed) {
         sections.push(ChatMessageResolveRegainTag);
      }

      // Otherwise, add apply persistent damage button
      else {
         sections.push(ChatMessageApplyResolveRegainButton);
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
