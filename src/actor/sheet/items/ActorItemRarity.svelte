<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Reference to the item
   export let item = void 0;
</script>

<div class="rarity {item.system.rarity}">
   {localize(`LOCAL.${item.system.rarity}.label`)}
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .rarity {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include rarity-colors;
      padding: 0.25rem;
   }
</style>
