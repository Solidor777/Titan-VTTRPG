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
   if (document.data.flags.titan.damageTaken) {
      // Damage Resisted.
      if (document.data.flags.titan.damageResisted) {
         sections.unshift(localize('resistedX%Damage').replace('X%', document.data.flags.titan.damageResisted));
      }

      // Armored ignored.
      else if (document.data.flags.titan.ignoredArmor) {
         sections.unshift(localize('armorIgnored'));
      }

      // Wounds suffered.
      if (document.data.flags.titan.woundsSuffered) {

         // Stamina lost if wounds were suffered so that we can see the.
         // breakdown.
         if (document.data.flags.titan.staminaLost) {
            sections.push(localize('lostX%Stamina').replace('X%', document.data.flags.titan.staminaLost));
         }

         sections.push(localize('sufferedX%Wounds').replace('X%', document.data.flags.titan.woundsSuffered));
      }

      // Stamina.
      sections.push(ChatMessageStamina);

      // Add wounds if appropriate.
      if (document.data.flags.titan.wounds) {
         sections.push(ChatMessageWounds);
      }
   }

   // Add tags.
   if (document.data.flags.titan.tags) {

      // Penetrating.
      if (document.data.flags.titan.tags.penetrating) {
         tags.push(DamageReportChatMessagePenetratingTag);
      }

      // Ineffective.
      if (document.data.flags.titan.tags.ineffective) {
         tags.push(DamageReportChatMessageIneffectiveTag);
      }
   }
</script>

<ReportChatMessageBase {header} {sections} {tags}/>
