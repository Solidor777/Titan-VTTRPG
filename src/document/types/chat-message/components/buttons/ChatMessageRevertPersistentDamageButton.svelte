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
      let retVal = `<p>${localize('persistentDamage.desc')}</p>`;

      // Equipment.
      if (document.data.system.persistentDamageRevert.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.system.persistentDamageRevert.equipment}</p>`;
      }

      // Abilities.
      if (document.data.system.persistentDamageRevert.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.system.persistentDamageRevert.ability}</p>`;
      }

      // Effects.
      if (document.data.system.persistentDamageRevert.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.system.persistentDamageRevert.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies healing equal to the persistent damage total, reverting the damage, and marks the button as confirmed.
    */
   async function confirm() {
      if (assert(
         document.data?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker(document.data.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Apply healing to undo the damage.
            await actor.system.applyHealing(
               document.data.system.persistentDamageRevert.total,
               { report: false },
            );

            // Update the chat message. The partial persistentDamageRevert update deep-merges into the
            // stored object, preserving its total and per-source keys.
            await document.data.update({
               system: {
                  persistentDamageRevert: { confirmed: true },
                  stamina: { value: actor.system.resource.stamina.value },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={HEALING_ICON}
   label={localize('revertX%PersistentDamage').replace('X%', document.data.system.persistentDamageRevert.total)}
   tooltip={{ text: getTooltip(), localize: false }}
   confirmFn={confirm}
/>
