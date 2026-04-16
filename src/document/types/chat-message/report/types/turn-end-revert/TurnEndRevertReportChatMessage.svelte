<script>
   import ChatMessageRevertFastHealingButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRevertFastHealingButton.svelte';
   import ChatMessageRevertPersistentDamageButton
      from '~/document/types/chat-message/components/buttons/ChatMessageRevertPersistentDamageButton.svelte';
   import ChatMessageFastHealingRevertTag
      from '~/document/types/chat-message/components/tags/ChatMessageFastHealingRevertTag.svelte';
   import ChatMessagePersistentDamageRevertTag
      from '~/document/types/chat-message/components/tags/ChatMessagePersistentDamageRevertTag.svelte';
   import ChatMessageStamina from '~/document/types/chat-message/components/resources/ChatMessageStamina.svelte';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import TurnEndRevertReportChatMessageHeader
      from '~/document/types/chat-message/report/types/turn-end-revert/TurnEndRevertReportChatMessageHeader.svelte';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = TurnEndRevertReportChatMessageHeader;

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
</script>

<ReportChatMessageBase {header} {sections}/>
