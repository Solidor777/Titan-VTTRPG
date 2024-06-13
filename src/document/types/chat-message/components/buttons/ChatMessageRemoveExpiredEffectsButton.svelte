<script>
   import {getContext} from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {REMOVE_TEMP_EFFECTS_ICON} from '~/system/Icons.js';
   import ChatMessageButton from '~/document/types/chat-message/components/buttons/ChatMessageButton.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   // Removes expired effects from the chat message owner
   /**
    *
    */
   async function removeExpiredEffects() {

      // If we own this chat message and the actor associated with it
      if ($document?.isOwner) {
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Remove expired effects from the actor
            await actor.system.removeExpiredEffects();

            // Update this document
            $document.flags.titan.expiredEffectsRemoved = true;
            await $document.update({
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

<ChatMessageButton on:click={() => removeExpiredEffects()}>
   <i class="{REMOVE_TEMP_EFFECTS_ICON}"/>
   {localize('removeExpiredEffects')}
</ChatMessageButton>
