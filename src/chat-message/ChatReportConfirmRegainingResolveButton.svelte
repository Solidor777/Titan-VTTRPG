<script>
   import { getContext } from 'svelte';
   import { localize, getActor } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   // Context variables
   const document = getContext('DocumentStore');

   function confirmRegainResolve() {
      // Update the actor
      const character = getActor(
         $document.speaker.actor,
         $document.speaker.token
      )?.character;
      if (character) {
         character.regainResolve(
            $document.flags.titan.chatContext.resolveRegained,
            false
         );
      }

      // Update the document
      if (!$document.flags.titan.chatContext.resolveRegainConfirmed) {
         $document.flags.titan.chatContext.resolveRegainConfirmed = true;
         $document.update({
            flags: {
               titan: {
                  chatContext: {
                     resolveRegainConfirmed: true,
                  },
               },
            },
         });
      }
   }
</script>

<!--Apply healing button-->
<div class="button">
   <EfxButton on:click={() => confirmRegainResolve()}>
      <i class="fas fa-bolt" />
      {`${localize('confirmRegainingResolve')} (${
         $document.flags.titan.chatContext.resolveRegained
      })`}
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
