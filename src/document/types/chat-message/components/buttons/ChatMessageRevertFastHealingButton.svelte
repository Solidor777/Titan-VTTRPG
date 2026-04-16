<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { PERSISTENT_DAMAGE_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Calculates the tooltip HTML for the revert fast healing button.
    */
   function getTooltip() {
      // Base label.
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
   async function confirmRevertFastHealing() {
      if (assert(
         $document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Apply damage to undo the healing.
            await actor.system.applyDamage(
               $document.flags.titan.fastHealingRevert.total,
               {
                  ignoreArmor: true,
                  report: false,
               },
            );

            // Update the chat message.
            const updateData = {
               flags: {
                  titan: {
                     fastHealingRevert: {
                        confirmed: true,
                     },
                     stamina: {
                        value: actor.system.resource.stamina.value,
                     },
                  },
               },
            };
            if ($document.flags.titan.wounds) {
               updateData.flags.titan.wounds = {
                  value: actor.system.resource.wounds.value,
               };
            }
            await $document.update(updateData);
         }
      }
   }
</script>

<ChatMessageButton on:click={() => confirmRevertFastHealing()} tooltip={getTooltip()}>
   <i class={PERSISTENT_DAMAGE_ICON}/>
   {localize('revertX%FastHealing').replace(
      'X%',
      $document.flags.titan.fastHealingRevert.total,
   )}
</ChatMessageButton>
