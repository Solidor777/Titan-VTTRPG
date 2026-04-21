<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { PERSISTENT_DAMAGE_ICON } from '~/system/Icons.js';
   import ChatMessageResourceModButton
      from '~/document/types/chat-message/components/buttons/ChatMessageResourceModButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Builds the tooltip HTML for the button, including optional source breakdowns.
    * @returns {string} The tooltip HTML string.
    */
   function getTooltip() {
      /** @type {string} The tooltip HTML being built. */
      let retVal = `<p>${localize('fastHealing.desc')}</p>`;

      // Equipment.
      if ($document.flags.titan.fastHealingRevert.equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan.fastHealingRevert.equipment}</p>`;
      }

      // Abilities.
      if ($document.flags.titan.fastHealingRevert.ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan.fastHealingRevert.ability}</p>`;
      }

      // Effects.
      if ($document.flags.titan.fastHealingRevert.effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan.fastHealingRevert.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies damage equal to the fast healing total, reverting the healing, and marks the button as confirmed.
    */
   async function confirm() {
      if (assert(
         $document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Apply damage to undo the healing, bypassing armor.
            await actor.system.applyDamage(
               $document.flags.titan.fastHealingRevert.total,
               {
                  ignoreArmor: true,
                  report: false,
               },
            );

            // Build the update data, conditionally including wounds.
            /** @type {object} The data to update the document with. */
            const updateData = {
               flags: {
                  titan: {
                     fastHealingRevert: { confirmed: true },
                     stamina: { value: actor.system.resource.stamina.value },
                  },
               },
            };
            if ($document.flags.titan.wounds) {
               updateData.flags.titan.wounds = { value: actor.system.resource.wounds.value };
            }

            // Update the chat message.
            await $document.update(updateData);
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={PERSISTENT_DAMAGE_ICON}
   label={localize('revertX%FastHealing').replace('X%', $document.flags.titan.fastHealingRevert.total)}
   tooltip={getTooltip()}
   confirmFn={confirm}
/>
