<script>
   import { localize } from "~/helpers/Utility.js";

   export let resistance = void 0;
</script>

<div class="tag {resistance}">
   {localize(resistance)}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include resistance-colors;
      @include label;
      padding: 0.25rem;
      font-weight: bold;
   }
</style>
