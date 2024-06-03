<script>
   import applyDamageToTargets from '~/helpers/utility-functions/ApplyDamageToTargets.js';
   import applyHealingToTargets from '~/helpers/utility-functions/ApplyHealingToTargets.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {CLEAVE_ICON, DAMAGE_ICON, HALF_DAMAGE_ICON, HEALING_ICON, IGNORE_ARMOR_ICON} from '~/system/Icons';

   export let damage = void 0;
   export let ineffective = false;
   export let penetrating = false;
   export let cleave = 0;
</script>

<div class="damage-buttons">
   <!--Apply damage button-->
   <div class="button" use:tooltip={localize('applyDamage')}>
      <Button
         on:click={() => {
            applyDamageToTargets(damage, {
               ineffective: ineffective,
               penetrating: penetrating,
            });
         }}
      ><i class={DAMAGE_ICON}/>
      </Button>
   </div>

   <!--Cleave Button-->
   {#if cleave > 0}
      <div
         class="button"
         use:tooltip={localize('applyCleaveDamage')}
      >
         <Button
            on:click={() => {
               applyDamageToTargets(cleave, {
                  ineffective: ineffective,
                  penetrating: penetrating,
               });
            }}
         >
            <i class={CLEAVE_ICON}/>
         </Button>
      </div>
   {/if}

   <!--Apply damage ignore armor button-->
   <div
      class="button"
      use:tooltip={localize('applyDamageIgnoreArmor')}
   >
      <Button
         on:click={() => {
            applyDamageToTargets(damage, {
               ineffective: ineffective,
               penetrating: penetrating,
               ignoreArmor: true,
            });
         }}
      ><i class={IGNORE_ARMOR_ICON}/>
      </Button>
   </div>

   <!--Apply half damage button-->
   <div class="button" use:tooltip={localize('applyHalfDamage')}>
      <Button
         on:click={() => {
            applyDamageToTargets(Math.max(Math.floor(damage / 2), 1), {
               ineffective: ineffective,
               penetrating: penetrating,
            });
         }}
      >
         <i class="{HALF_DAMAGE_ICON}"/>
      </Button>
   </div>

   <!--Apply healing button-->
   <div class="button" use:tooltip={localize('applyHealing')}>
      <Button on:click={() => applyHealingToTargets(damage)}>
         <i class="{HEALING_ICON}"/>
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

         --titan-button-border-radius: var(--titan-button-chat-message-border-radius);

         &:not(:first-child) {
            padding-left: var(--titan-padding-standard);
         }

         &:not(:last-child) {
            padding-right: var(--titan-padding-standard);
         }
      }

      .fas {
         @include font-size-extra-large;
      }
   }
</style>
