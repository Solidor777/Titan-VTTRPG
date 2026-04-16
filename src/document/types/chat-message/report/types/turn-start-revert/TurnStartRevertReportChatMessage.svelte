<script>
   import ChatMessageRevertFastHealingButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRevertFastHealingButton.svelte';
   import ChatMessageRevertPersistentDamageButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRevertPersistentDamageButton.svelte';
   import ChatMessageRevertResolveRegainButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRevertResolveRegainButton.svelte';
   import ChatMessageFastHealingRevertTag
      from '~/document/types/chat-message/components/tags/ChatMessageFastHealingRevertTag.svelte';
   import ChatMessagePersistentDamageRevertTag
      from '~/document/types/chat-message/components/tags/ChatMessagePersistentDamageRevertTag.svelte';
   import ChatMessageResolveRegainRevertTag
      from '~/document/types/chat-message/components/tags/ChatMessageResolveRegainRevertTag.svelte';
   import ChatMessageResolve from '~/document/types/chat-message/components/resources/ChatMessageResolve.svelte';
   import ChatMessageStamina from '~/document/types/chat-message/components/resources/ChatMessageStamina.svelte';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import TurnStartRevertReportChatMessageHeader
      from '~/document/types/chat-message/report/types/turn-start-revert/TurnStartRevertReportChatMessageHeader.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = TurnStartRevertReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [];

   // Add Stamina if appropriate.
   if ($document.flags.titan.stamina) {
      sections.push(ChatMessageStamina);
   }

   // Add Wounds if appropriate.
   if ($document.flags.titan.wounds) {
      sections.push(ChatMessageWounds);
   }

   // Add Resolve if appropriate.
   if ($document.flags.titan.resolve) {
      sections.push(ChatMessageResolve);
   }

   // Add fast healing revert information if appropriate.
   if ($document.flags.titan.fastHealingRevert) {

      // Add fast healing revert tag if confirmed.
      if ($document.flags.titan.fastHealingRevert.confirmed) {
         sections.push(ChatMessageFastHealingRevertTag);
      }

      // Otherwise, add revert fast healing button.
      else {
         sections.push(ChatMessageRevertFastHealingButton);
      }
   }

   // Add persistent damage revert information if appropriate.
   if ($document.flags.titan.persistentDamageRevert) {

      // Add persistent damage revert tag if confirmed.
      if ($document.flags.titan.persistentDamageRevert.confirmed) {
         sections.push(ChatMessagePersistentDamageRevertTag);
      }

      // Otherwise, add revert persistent damage button.
      else {
         sections.push(ChatMessageRevertPersistentDamageButton);
      }
   }

   // Add resolve regain revert information if appropriate.
   if ($document.flags.titan.resolveRegainRevert) {

      // Add resolve regain revert tag if confirmed.
      if ($document.flags.titan.resolveRegainRevert.confirmed) {
         sections.push(ChatMessageResolveRegainRevertTag);
      }

      // Otherwise, add revert resolve regain button.
      else {
         sections.push(ChatMessageRevertResolveRegainButton);
      }
   }
</script>

<ReportChatMessageBase {header} {sections}/>
