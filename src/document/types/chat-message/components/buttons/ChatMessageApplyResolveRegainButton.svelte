<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REGAIN_RESOLVE_ICON } from '~/system/Icons.js';
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
      let retVal = `<p>${localize('resolveRegain.desc')}</p>`;

      // Equipment.
      if (document.data.flags.titan.resolveRegain.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.flags.titan.resolveRegain.equipment}</p>`;
      }

      // Abilities.
      if (document.data.flags.titan.resolveRegain.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.flags.titan.resolveRegain.ability}</p>`;
      }

      // Effects.
      if (document.data.flags.titan.resolveRegain.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.flags.titan.resolveRegain.effect}</p>`;
      }

      return retVal;
   }

   /**
    * Applies resolve regain to the character that owns this chat message and updates the message accordingly.
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

            // Restore resolve to the actor.
            await actor.system.regainResolve(
               document.data.flags.titan.resolveRegain.total,
               { report: false },
            );

            // Update the chat message.
            await document.data.update({
               flags: {
                  titan: {
                     resolveRegain: { confirmed: true },
                     resolve: { value: actor.system.resource.resolve.value },
                  },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={REGAIN_RESOLVE_ICON}
   label={localize('regainX%Resolve').replace('X%', document.data.flags.titan.resolveRegain.total)}
   tooltip={getTooltip()}
   confirmFn={confirm}
/>
