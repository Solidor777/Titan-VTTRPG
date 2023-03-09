<script>
   import {
      localize,
      applyDamageToTargets,
      applyHealingToTargets,
   } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';

   export let damage = void 0;
   export let ineffective = false;
   export let penetrating = false;
   export let magical = false;
</script>

<div class="damage-buttons">
   <!--Apply damage button-->
   <div class="button" use:tooltip={{ content: localize('applyDamage') }}>
      <EfxButton
         on:click={() => {
            applyDamageToTargets(damage, {
               ineffective: ineffective,
               penetrating: penetrating,
               magical: magical,
            });
         }}
         ><i class="fas fa-burst" />
      </EfxButton>
   </div>

   <!--Apply damage ignore armor button-->
   <div
      class="button"
      use:tooltip={{ content: localize('applyDamageIgnoreArmor') }}
   >
      <EfxButton
         on:click={() =>
            applyDamageToTargets(damage, {
               ignoreArmor: true,
               ineffective: ineffective,
               penetrating: penetrating,
               magical: magical,
            })}
         ><i class="fas fa-shield-slash" />
      </EfxButton>
   </div>

   <!--Apply half damage button-->
   <div class="button" use:tooltip={{ content: localize('applyHalfDamage') }}>
      <EfxButton
         on:click={() =>
            applyDamageToTargets(Math.floor(damage / 2), {
               ineffective: ineffective,
               penetrating: penetrating,
               magical: magical,
            })}
      >
         <i class="fas fa-heart-half-stroke" />
      </EfxButton>
   </div>

   <!--Apply healing button-->
   <div class="button" use:tooltip={{ content: localize('applyHealing') }}>
      <EfxButton on:click={() => applyHealingToTargets(damage)}>
         <i class="fas fa-heart" />
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
