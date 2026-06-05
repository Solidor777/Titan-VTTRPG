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
      if (document.data.system.fastHealingRevert.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.system.fastHealingRevert.equipment}</p>`;
      }

      // Abilities.
      if (document.data.system.fastHealingRevert.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.system.fastHealingRevert.ability}</p>`;
      }

      // Effects.
      if (document.data.system.fastHealingRevert.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.system.fastHealingRevert.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies damage equal to the fast healing total, reverting the healing, and marks the button as confirmed.
    */
   async function confirm() {
      if (assert(
         document.data?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker(document.data.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Apply damage to undo the healing, bypassing armor.
            await actor.system.applyDamage(
               document.data.system.fastHealingRevert.total,
               {
                  ignoreArmor: true,
                  report: false,
               },
            );

            // Build the update data, conditionally including wounds. The partial fastHealingRevert update
            // deep-merges into the stored object, preserving its total and per-source keys.
            /** @type {object} The data to update the document with. */
            const updateData = {
               system: {
                  fastHealingRevert: { confirmed: true },
                  stamina: { value: actor.system.resource.stamina.value },
               },
            };
            if (document.data.system.wounds) {
               updateData.system.wounds = { value: actor.system.resource.wounds.value };
            }

            // Update the chat message.
            await document.data.update(updateData);
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={PERSISTENT_DAMAGE_ICON}
   label={localize('revertX%FastHealing').replace('X%', document.data.system.fastHealingRevert.total)}
   tooltip={{ text: getTooltip(), localize: false }}
   confirmFn={confirm}
/>
