<script>
   import applyDamageToTargets from '~/helpers/utility-functions/ApplyDamageToTargets.js';
   import applyHealingToTargets from '~/helpers/utility-functions/ApplyHealingToTargets.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {
      DAMAGE_ICON,
      HALF_DAMAGE_ICON,
      HEALING_ICON,
      IGNORE_ARMOR_ICON,
   } from '~/system/Icons.js';

   /** @type {number} The amount of damage to apply. */
   export let damage = void 0;

   /** @type {boolean} Whether the attack is ineffective (deals half damage). */
   export let ineffective = false;

   /** @type {boolean} Whether the attack is penetrating (ignores some armor). */
   export let penetrating = false;
</script>

<div class="damage-buttons">
   <!--Apply damage button-->
   <div class="button" use:tooltipAction={'applyDamage'}>
      <Button
         onclick={() => {
            applyDamageToTargets(damage, {
               ineffective: ineffective,
               penetrating: penetrating,
            });
         }}
      ><i class={DAMAGE_ICON}/>
      </Button>
   </div>

   <!--Apply damage ignore armor button-->
   <div class="button" use:tooltipAction={'applyDamageIgnoreArmor'}>
      <Button
         onclick={() =>
            applyDamageToTargets(damage, {
               ignoreArmor: true,
               ineffective: ineffective,
               penetrating: penetrating,
            })}
      ><i class={IGNORE_ARMOR_ICON}/>
      </Button>
   </div>

   <!--Apply half damage button-->
   <div class="button" use:tooltipAction={'applyHalfDamage'}>
      <Button
         onclick={() =>
            applyDamageToTargets(Math.floor(damage / 2), {
               ineffective: ineffective,
               penetrating: penetrating,
            })}
      >
         <i class={HALF_DAMAGE_ICON}/>
      </Button>
   </div>

   <!--Apply healing button-->
   <div class="button" use:tooltipAction={'applyHealing'}>
      <Button onclick={() => applyHealingToTargets(damage)}>
         <i class={HEALING_ICON}/>
      </Button>
   </div>
</div>

<style lang="scss">
   .damage-buttons {
      @include flex-row;

      width: 100%;

      .button {
         @include flex-row;

         width: 100%;

         --titan-button-border-radius: var(--titan-button-border-radius);

         &:not(:first-child) {
            @include padding-left-standard;
         }

         &:not(:last-child) {
            @include padding-right-standard;
         }
      }

      .fas {
         @include font-size-extra-large;
      }
   }
</style>
