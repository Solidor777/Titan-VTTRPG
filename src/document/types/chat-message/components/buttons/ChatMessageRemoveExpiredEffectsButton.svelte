<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { REMOVE_TEMP_EFFECTS_ICON } from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Removes expired effects from the character that owns this chat message.
    */
   async function removeExpiredEffects() {
      // If we own this chat message and the actor associated with it.
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         const actor = getActorFromSpeaker(document.data.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Remove expired effects from the actor.
            await actor.system.removeExpiredEffects();

            // Update this document.
            document.data.flags.titan.expiredEffectsRemoved = true;
            await document.data.update({
               flags: {
                  titan: {
                     expiredEffectsRemoved: true,
                  },
               },
            });
         }
      }
   }
</script>

<ChatMessageButton onclick={() => removeExpiredEffects()}>
   <i class={REMOVE_TEMP_EFFECTS_ICON}></i>
   <Text text="removeExpiredEffects"/>
</ChatMessageButton>
