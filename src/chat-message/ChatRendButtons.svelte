<script>
   import {
      localize,
      applyRendToTargets,
      applyRepairsToTargets,
   } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let rend = void 0;
   export let magical = false;
</script>

<div class="damage-buttons">
   <!--Apply Rend button-->
   <div class="button" use:tooltip={{ content: localize('rendArmor') }}>
      <EfxButton
         on:click={() => {
            applyRendToTargets(rend, {
               magical: magical,
            });
         }}
         ><i class="fas fa-hammer-crash" />
         <div>{localize('rend')}</div>
      </EfxButton>
   </div>

   <!--Repair Rend button-->
   <div class="button" use:tooltip={{ content: localize('repairArmor') }}>
      <EfxButton on:click={() => applyRepairsToTargets(rend)}>
         <i class="fas fa-screwdriver-wrench" />
         <div>{localize('repair')}</div>
      </EfxButton>
   </div>
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';

   .damage-buttons {
      @include flex-row;
      width: 100%;

      .button {
         @include flex-row;
         width: 100%;
         --button-border-radius: 10px;

         &:not(:first-child) {
            padding-left: 0.25rem;
         }

         &:not(:last-child) {
            padding-right: 0.25rem;
         }
      }

      .fas {
         @include font-size-extra-large;
         margin-right: 0.25rem;
      }
   }
</style>
