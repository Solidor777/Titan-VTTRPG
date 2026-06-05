<script>
   import ChatMessageStamina from '~/document/types/chat-message/components/resources/ChatMessageStamina.svelte';
   import ChatMessageWounds from '~/document/types/chat-message/components/resources/ChatMessageWounds.svelte';
   import DamageReportChatMessageHeader
      from '~/document/types/chat-message/report/types/damage/DamageReportChatMessageHeader.svelte';
   import DamageReportChatMessageIneffectiveTag
      from '~/document/types/chat-message/report/types/damage/DamageReportChatMessageIneffectiveTag.svelte';
   import DamageReportChatMessagePenetratingTag
      from '~/document/types/chat-message/report/types/damage/DamageReportChatMessagePenetratingTag.svelte';
   import ReportChatMessageBase from '~/document/types/chat-message/report/components/ReportChatMessageBase.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The header Svelte component to render. */
   const header = DamageReportChatMessageHeader;

   /** @type {object[] | string[]} Array of section Svelte components to include. */
   const sections = [];

   /** @type {object[]} Array of tag Svelte components to include. */
   const tags = [];

   // If we took damage, conditionally add more information to the messages.
   if (document.data.system.damageTaken) {
      // Damage Resisted.
      if (document.data.system.damageResisted) {
         sections.unshift(localize('resistedX%Damage').replace('X%', document.data.system.damageResisted));
      }

      // Armored ignored.
      else if (document.data.system.ignoredArmor) {
         sections.unshift(localize('armorIgnored'));
      }

      // Wounds suffered.
      if (document.data.system.woundsSuffered) {

         // Stamina lost if wounds were suffered so that we can see the.
         // breakdown.
         if (document.data.system.staminaLost) {
            sections.push(localize('lostX%Stamina').replace('X%', document.data.system.staminaLost));
         }

         sections.push(localize('sufferedX%Wounds').replace('X%', document.data.system.woundsSuffered));
      }

      // Stamina.
      sections.push(ChatMessageStamina);

      // Add wounds if appropriate.
      if (document.data.system.wounds) {
         sections.push(ChatMessageWounds);
      }
   }

   // Add tags.
   if (document.data.system.tags) {

      // Penetrating.
      if (document.data.system.tags.penetrating) {
         tags.push(DamageReportChatMessagePenetratingTag);
      }

      // Ineffective.
      if (document.data.system.tags.ineffective) {
         tags.push(DamageReportChatMessageIneffectiveTag);
      }
   }
</script>

<ReportChatMessageBase {header} {sections} {tags}/>
