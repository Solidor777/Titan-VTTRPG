<script>
   import { getContext } from 'svelte';
   import { localize, getActor, getSetting } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Context variables
   const document = getContext('DocumentStore');
   function removeExpiredEffects() {
      // Update the actor
      const character = getActor(
         $document.speaker.actor,
         $document.speaker.token
      )?.character;
      if (character) {
         character.removeExpiredEffects(true);
         $document.flags.titan.expiredEffectsRemoved = true;
         $document.update({
            flags: {
               titan: {
                  expiredEffectsRemoved: true,
                  expiredEffects: false,
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
   @import '../../../styles/Mixins.scss';

   .button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: 10px;
   }
</style>
