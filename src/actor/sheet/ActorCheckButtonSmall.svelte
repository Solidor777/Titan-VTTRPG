<script>
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import { getContext } from "svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Check
   export let check = {
      attribute: "body",
      skill: "athletics",
      difficulty: 4,
      complexity: 0,
   };
</script>

<div class="item-check-button {check.attribute}">
   <EfxButton>
      <div class="button-inner">
         {check.difficulty}:{check.complexity}
         <div class="pool">
            ({$document.system.attribute[check.attribute].value +
               (check.skill ? $document.system.skill[check.skill].training.value : 0)})
         </div>
         <i class="fas fa-dice" />
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .item-check-button {
      @include flex-row;

      &.body {
         --button-background-color: var(--body-color-bright);
      }

      &.mind {
         --button-background-color: var(--mind-color-bright);
      }

      &.soul {
         --button-background-color: var(--soul-color-bright);
      }

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         line-height: normal;
         padding: 0.25rem;
         font-size: 1rem;

         .pool {
            @include border-left;
            padding-left: 0.25rem;
            margin-left: 0.25rem;
         }

         i {
            margin-left: 0.25rem;
         }
      }
   }
</style>
