<script>
   import { localize } from "~/helpers/Utility.js";
   export let value = void 0;
</script>

<div class="stat">
   <div class="label">
      {localize("value")}
   </div>
   <div class="value">
      {value}
   </div>
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      padding: 0.25rem;

      .label {
         @include border-right;
         font-weight: bold;
         padding-right: 0.25rem;
         margin-right: 0.25rem;
      }
   }
</style>
