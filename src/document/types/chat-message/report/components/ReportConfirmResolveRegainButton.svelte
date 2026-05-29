<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REGAIN_RESOLVE_ICON } from '~/system/Icons.js';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Applies resolve regain to the chat message owner and marks it as confirmed.
    */
   async function confirmRegainResolve() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         // Get the actor.
         const actor = getActorFromSpeaker($document.speaker);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Update the actor.
            await actor.system.regainResolve($document.flags.titan.resolveRegain.total);

            // Update the chat document.
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
   <Button onclick={() => confirmRegainResolve()}>
      <i class={REGAIN_RESOLVE_ICON}/>
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

      --titan-button-border-radius: var(--titan-button-border-radius);
   }
</style>
