<script>
   import { getContext } from 'svelte';
   import { localize, getActor } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Context variables
   const document = getContext('DocumentStore');

   async function confirmdamageApplied() {
      // Get the actor
      const actor = getActor($document.speaker.actor, $document.speaker.token);
      if (actor) {
         const character = actor.character;
         if (character) {
            // Update the actor
            await character.applyDamage(
               $document.flags.titan.chatContext.damageApplied.total,
               false,
               false,
               true
            );

            // Update the chat document
            await $document.update({
               flags: {
                  titan: {
                     chatContext: {
                        damageApplied: {
                           confirmed: true,
                        },
                        stamina: {
                           value: actor.system.resource.stamina.value,
                        },
                        wounds: {
                           value: actor.system.resource.wounds.value,
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
   <EfxButton on:click={() => confirmdamageApplied()}>
      <i class="fas fa-heart" />
      {localize('apply%xDamage').replace(
         '%x',
         $document.flags.titan.chatContext.damageApplied.total
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
