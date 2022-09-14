<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   export let resistance = void 0;
</script>

<div class="tag {resistance}">
   {localize(`LOCAL.${resistance}.label`)}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      padding: 0.25rem;

      &.reflexes {
         background: var(--reflexes-color-bright);
      }

      &.resilience {
         background: var(--resilience-color-bright);
      }

      &.willpower {
         background: var(--willpower-color-bright);
      }
   }
</style>
