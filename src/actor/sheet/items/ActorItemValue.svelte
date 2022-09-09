<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Reference to the item
   export let item = void 0;
</script>

<!--Item Value-->
<div class="item-value">
   <!--Label-->
   <div class="label">
      {localize("LOCAL.value.label")}:
   </div>

   <!--Value-->
   <div class="value">
      {item.system.value}
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-value {
      @include flex-row;
      @include flex-group-center;
      @include border;
      padding: 0.25rem;
      background: var(--label-background-color);

      .label {
         margin-right: 0.25rem;
      }
   }
</style>
