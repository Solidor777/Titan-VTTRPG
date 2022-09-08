<script>
   import { getContext } from "svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Idx of the reference
   export let idx = void 0;
</script>

<div class="check-settings">
   {$document.system.check[idx].label}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .check-settings {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
   }
</style>
