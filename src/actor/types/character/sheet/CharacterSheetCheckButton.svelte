<script>
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import { getContext } from 'svelte';
   // Reference to the docuement
   const document = getContext('DocumentStore');

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
   <EfxButton on:click>
      <div class="button-inner">
         <!--DC-->
         <div class="dc">
            {check.difficulty}:{check.complexity}
         </div>

         <!--Pool-->
         <div class="stat">
            <i class="fas fa-dice-d6" />
            {$document.system.attribute[check.attribute].value +
               (check.skill
                  ? $document.system.skill[check.skill].training.value
                  : 0) +
               diceMod}
         </div>

         <!--Expertise-->
         {#if check.skill && $document.system.skill[check.skill].expertise.value + expertiseMod > 0}
            <div class="stat">
               <i class="fas fa-graduation-cap" />
               {$document.system.skill[check.skill].expertise.value +
                  expertiseMod}
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if check.resolveCost}
            <div class="stat">
               <i class="fas fa-bolt" />
               {check.resolveCost}
            </div>
         {/if}
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

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
         padding: 0.25rem;

         i {
            margin-right: 0.25rem;
         }

         .stat {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            @include border-color-button;
            padding-left: 0.25rem;
            margin-left: 0.25rem;
         }
      }
   }
</style>
