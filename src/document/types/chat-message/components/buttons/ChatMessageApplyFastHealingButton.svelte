<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { HEALING_ICON } from '~/system/Icons.js';
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
      if (document.data.system.fastHealing.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.system.fastHealing.equipment}</p>`;
      }

      // Abilities.
      if (document.data.system.fastHealing.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.system.fastHealing.ability}</p>`;
      }

      // Effects.
      if (document.data.system.fastHealing.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.system.fastHealing.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies healing to the character that owns this chat message and updates the message accordingly.
    */
   async function confirm() {
      // If we own this chat message and the associated actor.
      if (assert(
         document.data?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker(document.data.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Apply healing to the actor.
            await actor.system.applyHealing(
               document.data.system.fastHealing.total,
               { report: false },
            );

            // Update the chat message. The partial fastHealing update deep-merges into the stored object,
            // preserving its total and per-source keys.
            await document.data.update({
               system: {
                  fastHealing: { confirmed: true },
                  stamina: { value: actor.system.resource.stamina.value },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={HEALING_ICON}
   label={localize('healX%Damage').replace('X%', document.data.system.fastHealing.total)}
   tooltip={{ text: getTooltip(), localize: false }}
   confirmFn={confirm}
/>
