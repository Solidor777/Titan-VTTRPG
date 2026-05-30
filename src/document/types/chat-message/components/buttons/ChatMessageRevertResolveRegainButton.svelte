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
    * Regains resolve equal to the regain revert total, reverting the spend, and marks the button as confirmed.
    */
   async function confirm() {
      if (assert(
         document.data?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker(document.data.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Regain resolve to undo the spend.
            await actor.system.regainResolve(
               document.data.flags.titan.resolveRegainRevert.total,
               { report: false },
            );

            // Update the chat message.
            await document.data.update({
               flags: {
                  titan: {
                     resolveRegainRevert: { confirmed: true },
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
   label={localize('revertX%ResolveRegain').replace('X%', document.data.flags.titan.resolveRegainRevert.total)}
   confirmFn={confirm}
/>
