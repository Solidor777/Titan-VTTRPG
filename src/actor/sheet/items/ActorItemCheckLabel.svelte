<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Collapsed object
   export let item = void 0;
</script>

<div class="item-check-label {item.system.check.attribute}">
   <div class="skill-attribute">
      {`${localize(`LOCAL.${item.system.check.attribute}.label`)} (${localize(
         `LOCAL.${item.system.check.skill}.label`
      )})`}
   </div>

   <div class="divider" />

   <div class="difficulty-complexity">
      {item.system.difficulty}:{item.system.complexity}
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-check-label {
      @include flex-row;
      @include flex-group-center;
      @include attribute-colors;
      @include border;
      padding: 0.5rem;
      font-size: 0.9rem;
      font-weight: bold;
      height: 100%;

      .skill-attribute {
         @include flex-row;
         @include flex-group-top;
         height: 100%;
      }

      .divider {
         @include flex-row;
         @include flex-group-center;
         @include border-left;
         margin-left: 0.25rem;
         padding-right: 0.25rem;
         height: 1rem;
      }

      .difficulty-complexity {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
      }
   }
</style>
