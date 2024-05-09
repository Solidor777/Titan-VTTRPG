<script>
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { getContext } from 'svelte';
   import { DICE_ICON, EXPERTISE_ICON, SPEND_RESOLVE_ICON } from '~/system/Icons.js';

   // Reference to the docuement
   const document = getContext('document');

   // Check
   export let check = {
      attribute: 'body',
      skill: 'athletics',
      difficulty: 4,
      complexity: 0,
   };

   export let diceMod = 0;
   export let expertiseMod = 0;
</script>

<div class="item-check-button {check.attribute}">
   <Button on:click>
      <div class="button-inner">
         <!--DC-->
         <div class="dc">
            {check.difficulty}:{check.complexity}
         </div>

         <!--Pool-->
         <div class="stat">
            <i class="{DICE_ICON}"/>
            {$document.system.attribute[check.attribute].value +
            (check.skill && check.skill !== 'none'
               ? $document.system.skill[check.skill].training.value
               : 0) +
            diceMod}
         </div>

         <!--Expertise-->
         {#if check.skill && check.skill !== 'none' && $document.system.skill[check.skill].expertise.value + expertiseMod > 0}
            <div class="stat">
               <i class="{EXPERTISE_ICON}"/>
               {$document.system.skill[check.skill].expertise.value +
               expertiseMod}
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if check.resolveCost}
            <div class="stat">
               <i class="{SPEND_RESOLVE_ICON}"/>
               {check.resolveCost}
            </div>
         {/if}
      </div>
   </Button>
</div>

<style lang="scss">
   .item-check-button {
      @include flex-row;

      &.body {
         --button-background: var(--body-color);
      }

      &.mind {
         --button-background: var(--mind-color);
      }

      &.soul {
         --button-background: var(--soul-color);
      }

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         height: 100%;
         line-height: normal;
         padding: var(--padding-standard);

         i {
            margin-right: var(--padding-standard);
         }

         .stat {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            @include border-color-button;
            padding-left: var(--padding-standard);
            margin-left: var(--padding-standard);
         }
      }
   }
</style>
