<script>
   import { localize } from "~/helpers/Utility.js";

   export let rarity = void 0;
</script>

<div class="tag {rarity}">
   {localize(rarity)}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      @include rarity-colors;
      padding: 0.25rem;
      font-weight: bold;
   }
</style>
