<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Reference to the item
   export let item = void 0;

   console.log(item.system);
</script>

<!--Footer-->
<div class="item-footer">
   <!--Rarity-->
   <div class="item-footer-field {item.system.rarity}">
      {localize(`LOCAL.${item.system.rarity}.label`)}
   </div>

   <!--Tradition-->
   <div class="item-footer-field">
      <div class="item-footer-label">
         {localize("LOCAL.tradition.label")}:
      </div>
      <div class="item-footer-value">
         {item.system.tradition}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-footer {
      @include flex-row;
      @include flex-space-evenly;
      width: 100%;
      font-size: 0.9rem;
      font-weight: bold;

      .item-footer-field {
         @include flex-row;
         @include border;
         padding: 0.25rem;
         background-color: var(--label-background-color);

         &.uncommon {
            background-color: var(--uncommon-color-bright);
         }

         &.rare {
            background-color: var(--rare-color-bright);
         }

         &.unique {
            background-color: var(--unique-color-bright);
         }

         .item-footer-value {
            margin-left: 0.5rem;
         }
      }
   }
</style>
