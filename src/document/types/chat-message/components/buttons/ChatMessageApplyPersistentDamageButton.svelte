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
      let retVal = `<p>${localize('persistentDamage.desc')}</p>`;

      // Equipment.
      if (document.data.system.persistentDamage.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.system.persistentDamage.equipment}</p>`;
      }

      // Abilities.
      if (document.data.system.persistentDamage.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.system.persistentDamage.ability}</p>`;
      }

      // Effects.
      if (document.data.system.persistentDamage.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.system.persistentDamage.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies damage to the character that owns this chat message and updates the message accordingly.
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

            // Apply persistent damage to the actor, bypassing armor.
            await actor.system.applyDamage(
               document.data.system.persistentDamage.total,
               {
                  report: false,
                  ignoreArmor: true,
               },
            );

            // Update the chat message. The partial persistentDamage update deep-merges into the stored
            // object, preserving its total and per-source keys.
            await document.data.update({
               system: {
                  persistentDamage: { confirmed: true },
                  stamina: { value: actor.system.resource.stamina.value },
                  wounds: { value: actor.system.resource.wounds.value },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={PERSISTENT_DAMAGE_ICON}
   label={localize('applyX%Damage').replace('X%', document.data.system.persistentDamage.total)}
   tooltip={{ text: getTooltip(), localize: false }}
   confirmFn={confirm}
/>
