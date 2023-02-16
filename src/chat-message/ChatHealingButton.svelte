<script>
   import { localize, applyHealingToTargets } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let healing = void 0;

   // Document reference
   const document = getContext('DocumentStore');
</script>

<!--Apply healing button-->
<div class="healing-button" use:tooltip={{ content: localize('applyHealing') }}>
   <EfxButton on:click={() => applyHealingToTargets(healing, true, true)}>
      <i class="fas fa-heart" />
      {localize('apply%xHealing').replace('%x', healing)}
   </EfxButton>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

   .healing-button {
      @include flex-row;
      @include font-size-normal;
      width: 100%;
      --button-border-radius: 10px;
   }
</style>
