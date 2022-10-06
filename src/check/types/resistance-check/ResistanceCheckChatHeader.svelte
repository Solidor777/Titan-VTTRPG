<script>
   import { localize } from "~/helpers/Utility.js";

   // Check reference
   export let check = void 0;
</script>

<div class="label">
   <div class="content {check.parameters.resistance}">
      <!--Type Label -->
      {`${localize(check.parameters.resistance)} ${check.parameters.difficulty}:${check.parameters.complexity}`}
   </div>
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-center;
         @include border;
         @include resistance-colors;
         @include font-size-large;
         padding: 0.5rem;
         font-weight: bold;
      }
   }
</style>
