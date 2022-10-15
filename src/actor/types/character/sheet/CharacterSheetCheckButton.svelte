<script>
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import { getContext } from "svelte";
   // Reference to the docuement
   const document = getContext("DocumentStore");

   // Check
   export let check = {
      attribute: "body",
      skill: "athletics",
      difficulty: 4,
      complexity: 0,
   };
</script>

<div class="item-check-button {check.attribute}">
   <EfxButton on:click>
      <div class="button-inner">
         <!--DC-->
         <div class="dc">
            {check.difficulty}:{check.complexity}
         </div>

         <!--Pool-->
         <div class="pool">
            <i class="fas fa-dice-d6" />
            {$document.system.attribute[check.attribute].value +
               (check.skill ? $document.system.skill[check.skill].training.value : 0)}
         </div>

         <!--Expertise-->
         {#if check.skill && $document.system.skill[check.skill].expertise.value > 0}
            <div class="expertise">
               <i class="fa fa-graduation-cap" />
               {$document.system.skill[check.skill].expertise.value}
            </div>
         {/if}
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

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

         .pool {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            padding-left: 0.25rem;
            margin-left: 0.25rem;
         }

         .expertise {
            @include flex-row;
            @include flex-group-center;
            @include border-left;
            padding-left: 0.25rem;
            margin-left: 0.25rem;
         }
      }
   }
</style>
