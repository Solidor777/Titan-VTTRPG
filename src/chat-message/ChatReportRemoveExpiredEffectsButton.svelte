<script>
   import { getContext } from 'svelte';
   import { localize, getActor, getSetting } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import ConfirmRemoveExpiredEffectsDialog from '~/actor/types/character/dialogs/ConfirmRemoveExpiredEffectsDialog';

   // Context variables
   const document = getContext('DocumentStore');
   function removeExpiredEffects() {
      // Update the actor
      const character = getActor(
         $document.speaker.actor,
         $document.speaker.token
      )?.character;
      if (character) {
         // If we need to confirm the removal, create a dialog
         if (getSetting('autoRemoveExpiredEffectsConfirmButton') === true) {
            const dialog = new ConfirmRemoveExpiredEffectsDialog(
               character,
               confirmRemoveExpiredEffects,
               this
            );
            dialog.render(true);
         }

         // Otherwise, remove the effects
         else {
            character.removeExpiredEffects(true);
            confirmRemoveExpiredEffects();
         }
      }
   }

   function confirmRemoveExpiredEffects() {
      // Update the document
      if (!$document.flags.titan.chatContext.expiredEffectsRemoved) {
         $document.flags.titan.chatContext.expiredEffectsRemoved = true;
         $document.update({
            flags: {
               titan: {
                  chatContext: {
                     expiredEffectsRemoved: true,
                  },
               },
            },
         });
      }
   }
</script>

<!--Apply healing button-->
<div class="button">
   <EfxButton on:click={() => removeExpiredEffects()}>
      <i class="fas fa-clock" />
      {localize('removeExpiredEffects')}
   </EfxButton>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

   .button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: 10px;
   }
</style>
