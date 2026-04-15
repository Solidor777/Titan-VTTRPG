<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REGAIN_RESOLVE_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Calculates the tooltip HTML for the resolve regain button.
    */
   function getTooltip() {
      // Base label
      let retVal = `<p>${localize('resolveRegain.desc')}</p>`;

      // Equipment
      if ($document.flags.titan.resolveRegain.equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan.resolveRegain.equipment}</p>`;
      }

      // Abilities
      if ($document.flags.titan.resolveRegain.ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan.resolveRegain.ability}</p>`;
      }

      // Effects
      if ($document.flags.titan.resolveRegain.effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan.resolveRegain.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies resolve regain to the chat message owner and updates the message.
    */
   async function confirmResolveRegain() {
      // If we own this chat message and the associated actor
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Update the actor
            await actor.system.regainResolve(
               $document.flags.titan.resolveRegain.total,
               {
                  report: false,
               },
            );

            // Update the chat message
            await $document.update({
               flags: {
                  titan: {
                     resolveRegain: {
                        confirmed: true,
                     },
                     resolve: {
                        value: actor.system.resource.resolve.value,
                     },
                  },
               },
            });
         }
      }
   }
</script>

<ChatMessageButton on:click={() => confirmResolveRegain()} tooltip={getTooltip()}>
   <i class={REGAIN_RESOLVE_ICON}/>
   {localize('regainX%Resolve').replace(
      'X%',
      $document.flags.titan.resolveRegain.total,
   )}
</ChatMessageButton>
