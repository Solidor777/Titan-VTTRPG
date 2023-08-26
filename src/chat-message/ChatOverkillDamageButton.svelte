<script>
   import { localize, applyDamageToTargets } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let damage = void 0;
</script>

<div class="damage-buttons">
   <!--Apply damage ignore armor button-->
   <div
      class="button"
      use:tooltip={{ content: localize('applyOverkillDamage') }}
   >
      <EfxButton
         on:click={() =>
            applyDamageToTargets(damage, {
               ignoreArmor: true,
            })}
         ><i class="fas fa-explosion" />
         {localize('%xOverkillDamage').replace('%x', damage)}
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
      }
   }
</style>
