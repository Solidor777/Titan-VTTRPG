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
      if (document.data.system.resolveRegain.equipment) {
         retVal += `<p>${localize('equipment')}: ${document.data.system.resolveRegain.equipment}</p>`;
      }

      // Abilities.
      if (document.data.system.resolveRegain.ability) {
         retVal += `<p>${localize('abilities')}: ${document.data.system.resolveRegain.ability}</p>`;
      }

      // Effects.
      if (document.data.system.resolveRegain.effect) {
         retVal += `<p>${localize('effects')}: ${document.data.system.resolveRegain.effect}</p>`;
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
               document.data.system.resolveRegain.total,
               { report: false },
            );

            // Update the chat message. The partial resolveRegain update deep-merges into the stored object,
            // preserving its total and per-source keys.
            await document.data.update({
               system: {
                  resolveRegain: { confirmed: true },
                  resolve: { value: actor.system.resource.resolve.value },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={REGAIN_RESOLVE_ICON}
   label={localize('regainX%Resolve').replace('X%', document.data.system.resolveRegain.total)}
   tooltip={{ text: getTooltip(), localize: false }}
   confirmFn={confirm}
/>
