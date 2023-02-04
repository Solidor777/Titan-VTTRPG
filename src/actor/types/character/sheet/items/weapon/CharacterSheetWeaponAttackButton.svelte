<script>
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import { getContext } from 'svelte';
   // Reference to the docuement
   const document = getContext('DocumentStore');

   // Check
   export let attack = void 0;
</script>

<div class="button {attack.attribute}">
   <EfxButton on:click>
      <div class="button-inner">
         <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
         <!--Pool-->
         <div class="pool">
            <i class="fas fa-dice-d6" />
            {$document.system.attribute[attack.attribute].value +
               $document.system.skill[attack.skill].training.value}
         </div>

         <!--Expertise-->
         {#if $document.system.skill[attack.skill].expertise.value !== 0}
            <div class="expertise">
               <i class="fa fa-graduation-cap" />
               {$document.system.skill[attack.skill].expertise.value}
            </div>
         {/if}
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';

   .button {
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
         height: 100%;
         line-height: normal;
         padding: 0.25rem;
         @include font-size-normal;

         i {
            margin-right: 0.25rem;
         }

         .pool {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            @include border-color-button;
            padding-left: 0.25rem;
            margin-left: 0.25rem;
         }

         .expertise {
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
