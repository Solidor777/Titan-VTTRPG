<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Reference to the item
   export let item = void 0;
</script>

<!--Tradition-->
<div class="tradition">
   <!--Label-->
   <div class="label">
      {localize("LOCAL.tradition.label")}:
   </div>

   <!--Value-->
   <div class="value">
      {item.system.tradition}
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .tradition {
      @include flex-row;
      @include flex-group-center;
      @include border;
      padding: 0.25rem;
      background-color: var(--label-background-color);

      .label {
         margin-right: 0.25rem;
      }
   }
</style>
