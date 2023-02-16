<script>
   import { getContext } from 'svelte';
   import { localize, getActor } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Context variables
   const document = getContext('DocumentStore');

   async function confirmhealingApplied() {
      // Get the actor
      const actor = getActor($document.speaker.actor, $document.speaker.token);
      if (actor) {
         const character = actor.character;
         if (character) {
            // Update the actor
            await character.applyHealing(
               $document.flags.titan.chatContext.healingApplied.total,
               false,
               true
            );

            // Update the chat document
            await $document.update({
               flags: {
                  titan: {
                     chatContext: {
                        healingApplied: {
                           confirmed: true,
                        },
                        stamina: {
                           value: actor.system.resource.stamina.value,
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
   <EfxButton on:click={() => confirmhealingApplied()}>
      <i class="fas fa-heart" />
      {localize('heal%xDamage').replace(
         '%x',
         $document.flags.titan.chatContext.healingApplied.total
      )}
   </EfxButton>
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: 10px;
   }
</style>
