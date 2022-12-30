<script>
   import { localize } from "~/helpers/Utility.js";

   export let resistance = void 0;
</script>

<div class="tag {resistance}">
   <div class="label">
      {localize("resistedBy")}
   </div>
   <div class="value">
      {localize(`${resistance}`)}
   </div>
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      padding: 0.25rem;

      &.reflexes {
         background: var(--reflexes-color);
      }

      &.resilience {
         background: var(--resilience-color);
      }

      &.willpower {
         background: var(--willpower-color);
      }

      .label {
         @include border-right;
         font-weight: bold;
         padding-right: 0.25rem;
         margin-right: 0.25rem;
      }
   }
</style>
