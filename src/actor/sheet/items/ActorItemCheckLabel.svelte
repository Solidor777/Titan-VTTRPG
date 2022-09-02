<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Collapsed object
   export let item = void 0;
</script>

<div class="item-check-button {item.system.check.attribute}">
   <EfxButton>
      <div class="button-inner">
         <div class="skill-attribute">
            <div>
               {localize(`LOCAL.${item.system.check.attribute}.label`)}
            </div>
            <div>
               ({localize(`LOCAL.${item.system.check.skill}.label`)})
            </div>
         </div>

         <div class="divider" />

         <div class="difficulty-complexity">
            {item.system.difficulty}:{item.system.complexity}
            <i class="fas fa-dice" />
         </div>
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-check-button {
      @include flex-row;
      --button-border-radius: var(--border-radius);
      --button-font-size: 0.9rem;
      --button-padding: 0.25rem;
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

         .skill-attribute {
            @include flex-column;
            @include flex-group-top;
            font-size: 0.9rem;
            line-height: normal;
         }

         .divider {
            @include border-left;
            @include flex-row;
            margin-left: 0.25rem;
            padding-right: 0.25rem;
            height: 2rem;
         }

         .difficulty-complexity {
            @include flex-column;
            @include flex-group-center;
            font-size: 1rem;
            line-height: normal;
         }
      }
   }
</style>
