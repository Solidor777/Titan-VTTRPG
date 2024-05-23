<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REGAIN_RESOLVE_ICON } from '~/system/Icons.js';

   // Context variables
   const document = getContext('document');

   /**
    *
    */
   async function confirmRegainResolve() {
      if ($document?.isOwner) {
         // Get the actor
         const actor = getActorFromSpeaker($document.speaker.token, $document.speaker.actor);
         if (actor && actor.isOwner && actor.system.isCharacter) {
            
            // Update the actor
            await actor.system.regainResolve($document.flags.titan.resolveRegain.total);

            // Update the chat document
            $document.update({
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

<!--Regain resolve button-->
<div class="button">
   <Button on:click={() => confirmRegainResolve()}>
      <i class="{REGAIN_RESOLVE_ICON}"/>
      {localize('regainX%Resolve').replace(
         'X%',
         $document.flags.titan.resolveRegain.total,
      )}
   </Button>
</div>

<style lang="scss">
   .button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: var(--button-chat-message-border-radius);
   }
</style>
