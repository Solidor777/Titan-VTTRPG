<script>
   import {getContext} from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {PERSISTENT_DAMAGE_ICON} from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   // Calculate the tooltipAction for the resource mod
   /**
    *
    */
   function getTooltip() {
      // Base label
      let retVal = `<p>${localize(`persistentDamage.desc`)}</p>`;

      // Equipment
      if ($document.flags.titan.persistentDamage.equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan.persistentDamage.equipment}</p>`;
      }

      // Abilities
      if ($document.flags.titan.persistentDamage.ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan.persistentDamage.ability}</p>`;
      }

      // Effects
      if ($document.flags.titan.persistentDamage.effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan.persistentDamage.effect}</p>`;
      }

      return retVal;
   }

   // Applies damage to the character that owns this chat message and updates the message accordingly
   /**
    *
    */
   async function confirmPersistentDamage() {

      // If we own this chat message and the associated actor
      if ($document?.isOwner) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Update the actor
            await actor.system.applyDamage(
               $document.flags.titan.persistentDamage.total,
               {
                  report: false,
                  ignoreArmor: true,
               },
            );

            // Update the chat message
            const updateData = {
               flags: {
                  titan: {
                     persistentDamage: {
                        confirmed: true,
                     },
                     stamina: {
                        value: actor.system.resource.stamina.value,
                     },
                     wounds: {
                        value: actor.system.resource.wounds.value,
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

<ChatMessageButton on:click={() => confirmPersistentDamage()} tooltip={getTooltip()}>
   <i class="{PERSISTENT_DAMAGE_ICON}"/>
   {localize('applyX%Damage').replace(
      'X%',
      $document.flags.titan.persistentDamage.total,
   )}
</ChatMessageButton>
