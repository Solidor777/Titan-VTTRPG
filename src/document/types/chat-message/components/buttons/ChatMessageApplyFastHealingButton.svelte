<script>
   import {getContext} from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {HEALING_ICON} from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   // Calculate the tooltipAction for the resource mod
   /**
    *
    */
   function getTooltip() {
      // Base label
      let retVal = `<p>${localize(`fastHealing.desc`)}</p>`;

      // Equipment
      if ($document.flags.titan.fastHealing.equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan.fastHealing.equipment}</p>`;
      }

      // Abilities
      if ($document.flags.titan.fastHealing.ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan.fastHealing.ability}</p>`;
      }

      // Effects
      if ($document.flags.titan.fastHealing.effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan.fastHealing.effect}</p>`;
      }

      return retVal;
   }

   // Applies healing to the character that owns this chat message and updates the message accordingly
   /**
    *
    */
   async function confirmFastHealing() {

      // If we own this chat message and the associated actor
      if ($document?.isOwner) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Update the actor
            await actor.system.applyHealing(
               $document.flags.titan.fastHealing.total,
               {report: false},
            );

            // Update the chat message
            await $document.update({
               flags: {
                  titan: {
                     fastHealing: {
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

<ChatMessageButton on:click={() => confirmFastHealing()} tooltip={getTooltip()}>
   <i class="{HEALING_ICON}"/>
   {localize('healX%Damage').replace(
      'X%',
      $document.flags.titan.fastHealing.total,
   )}
</ChatMessageButton>
