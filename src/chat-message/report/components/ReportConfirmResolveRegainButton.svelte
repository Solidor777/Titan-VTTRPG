<script>
   import { getContext } from 'svelte';
   import { localize, getActor } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Context variables
   const document = getContext('DocumentStore');

   async function confirmRegainResolve() {
      // Get the actor
      const actor = getActor($document.speaker.actor, $document.speaker.token);
      if (actor) {
         const character = actor.character;
         if (character) {
            // Update the actor
            await character.regainResolve(
               $document.flags.titan.chatContext.resolveRegain.total,
               true
            );

            // Update the chat document
            $document.update({
               flags: {
                  titan: {
                     chatContext: {
                        resolveRegain: {
                           confirmed: true,
                        },
                        resolve: {
                           value: actor.system.resource.resolve.value,
                        },
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
   <EfxButton on:click={() => confirmRegainResolve()}>
      <i class="fas fa-bolt" />
      {localize('regain%xResolve').replace(
         '%x',
         $document.flags.titan.chatContext.resolveRegain.total
      )}
   </EfxButton>
</div>

<style lang="scss">
   @import '../../../styles/Mixins.scss';

   .button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: 10px;
   }
</style>
