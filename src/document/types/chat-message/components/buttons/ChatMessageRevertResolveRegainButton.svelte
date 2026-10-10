<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SPEND_RESOLVE_ICON } from '~/system/Icons.js';
   import ChatMessageResourceModButton
   from '~/document/types/chat-message/components/buttons/ChatMessageResourceModButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Spends the resolve the regain gave, up to the resolve held, reverting the regain, and marks the button as confirmed.
    */
   async function confirm() {
      if (assert(
         document.data?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker(document.data.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Spend the regained resolve, at most what the character holds (a regain stops at the maximum).
            await actor.system.spendResolve(
               Math.min(document.data.system.resolveRegainRevert.total, actor.system.resource.resolve.value),
               { report: false },
            );

            // Update the chat message. The partial resolveRegainRevert update deep-merges into the stored
            // object, preserving its total and per-source keys.
            await document.data.update({
               system: {
                  resolveRegainRevert: { confirmed: true },
                  resource: {
                     resolve: { value: actor.system.resource.resolve.value },
                  },
               },
            });
         }
      }
   }
</script>

<ChatMessageResourceModButton
   icon={SPEND_RESOLVE_ICON}
   label={localize('revertX%ResolveRegain').replace('X%', document.data.system.resolveRegainRevert.total)}
   confirmFn={confirm}
/>
