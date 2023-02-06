<script>
   import { localize, getActor, getSetting } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let actorId = void 0;
   export let tokenId = void 0;
   export let resolveRegained = void 0;

   function regainResolve() {
      const character = getActor(actorId, tokenId)?.character;
      if (character) {
         character.regainResolve(resolveRegained, false, true);
      }
   }
</script>

<!--Apply healing button-->
<div class="button">
   <EfxButton on:click={() => regainResolve()}>
      <i class="fas fa-bolt" />
      {`${localize('regainResolve')} (${resolveRegained})`}
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
