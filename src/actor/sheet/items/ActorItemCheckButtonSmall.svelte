<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Collapsed object
   export let item = void 0;
</script>

<div class="item-check-button {item.system.check.attribute}">
   <EfxButton>
      <div class="button-inner">
         {item.system.difficulty}:{item.system.complexity}
         <i class="fas fa-dice" />
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

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

         i {
            margin-left: 0.25rem;
         }
      }
   }
</style>
