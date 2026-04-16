<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { HEALING_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Calculates the tooltip HTML for the revert persistent damage button.
    */
   function getTooltip() {
      // Base label.
      let retVal = `<p>${localize('persistentDamage.desc')}</p>`;

      // Equipment.
      if ($document.flags.titan.persistentDamageRevert.equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan.persistentDamageRevert.equipment}</p>`;
      }

      // Abilities.
      if ($document.flags.titan.persistentDamageRevert.ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan.persistentDamageRevert.ability}</p>`;
      }

      // Effects.
      if ($document.flags.titan.persistentDamageRevert.effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan.persistentDamageRevert.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies healing equal to the persistent damage total, reverting the damage, and marks the button as confirmed.
    */
   async function confirmRevertPersistentDamage() {
      if (assert(
         $document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Apply healing to undo the damage.
            await actor.system.applyHealing(
               $document.flags.titan.persistentDamageRevert.total,
               { report: false },
            );

            // Update the chat message.
            await $document.update({
               flags: {
                  titan: {
                     persistentDamageRevert: {
                        confirmed: true,
                     },
                     stamina: {
                        value: actor.system.resource.stamina.value,
                     },
                  },
               },
            });
         }
      }
   }
</script>

<ChatMessageButton on:click={() => confirmRevertPersistentDamage()} tooltip={getTooltip()}>
   <i class={HEALING_ICON}/>
   {localize('revertX%PersistentDamage').replace(
      'X%',
      $document.flags.titan.persistentDamageRevert.total,
   )}
</ChatMessageButton>
