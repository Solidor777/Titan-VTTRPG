<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SPEND_RESOLVE_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Spends resolve equal to the regain total, reverting the regain, and marks the button as confirmed.
    */
   async function confirmRevertResolveRegain() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Spend resolve to undo the regain.
            await actor.system.spendResolve(
               $document.flags.titan.resolveRegainRevert.total,
               { report: false },
            );

            // Update the chat message.
            await $document.update({
               flags: {
                  titan: {
                     resolveRegainRevert: {
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

<ChatMessageButton on:click={() => confirmRevertResolveRegain()}>
   <i class={SPEND_RESOLVE_ICON}/>
   {localize('revertX%ResolveRegain').replace(
      'X%',
      $document.flags.titan.resolveRegainRevert.total,
   )}
</ChatMessageButton>
