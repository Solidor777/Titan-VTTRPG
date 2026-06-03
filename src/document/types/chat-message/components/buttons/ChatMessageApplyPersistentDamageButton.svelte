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
      if (document.data.flags.titan.persistentDamage.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.flags.titan.persistentDamage.equipment}</p>`;
      }

      // Abilities.
      if (document.data.flags.titan.persistentDamage.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.flags.titan.persistentDamage.ability}</p>`;
      }

      // Effects.
      if (document.data.flags.titan.persistentDamage.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.flags.titan.persistentDamage.effect}</p>`;
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
               document.data.flags.titan.persistentDamage.total,
               {
                  report: false,
                  ignoreArmor: true,
               },
            );

            // Update the chat message.
            await document.data.update({
               flags: {
                  titan: {
                     persistentDamage: { confirmed: true },
                     stamina: { value: actor.system.resource.stamina.value },
                     wounds: { value: actor.system.resource.wounds.value },
                  },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={PERSISTENT_DAMAGE_ICON}
   label={localize('applyX%Damage').replace('X%', document.data.flags.titan.persistentDamage.total)}
   tooltip={{ text: getTooltip(), localize: false }}
   confirmFn={confirm}
/>
