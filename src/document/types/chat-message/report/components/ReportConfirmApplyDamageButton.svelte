<script>
   import { getContext } from 'svelte';
   import getActorFromSpeaker from '~/helpers/utility-functions/GetActorFromSpeaker.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { REGAIN_RESOLVE_ICON } from '~/system/Icons.js';


   // Context variables
   const document = getContext('document');

   async function confirmdamageApplied() {
      if ($document?.isOwner) {
         // Get the actor
         const actor = getActorFromSpeaker($document.speaker.token, $document.speaker.actor);
         if (actor && actor.isOwner && actor.system.isCharacter) {

            // Update the actor
            await actor.system.applyDamage(
               $document.flags.titan.damageApplied.total,
               { ignoreArmor: true, report: false },
            );

            // Update the chat document
            await $document.update({
               flags: {
                  titan: {
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
            });
         }
      }
   }
</script>

<!--Regain resolve button-->
<div class="button">
   <Button on:click={() => confirmdamageApplied()}>
      <i class="{REGAIN_RESOLVE_ICON}"/>
      {localize('applyX%Damage').replace(
         'X%',
         $document.flags.titan.damageApplied.total,
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
