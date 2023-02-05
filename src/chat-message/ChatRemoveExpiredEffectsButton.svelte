<script>
   import { localize } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let actor = void 0;

   function removeExpiredEffects() {
      const character = actor?.character;
      if (character) {
         character.removeExpiredEffects(false);
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
