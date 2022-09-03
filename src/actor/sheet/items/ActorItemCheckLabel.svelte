<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   export let item = void 0;
</script>

<!--Check label-->
<div class="check-label {item.system.check.attribute}">
   <!--Skill & Attribute-->
   <div class="skill-attribute">
      {`${localize(`LOCAL.${item.system.check.attribute}.label`)} (${localize(
         `LOCAL.${item.system.check.skill}.label`
      )})`}
   </div>

   <div class="divider" />

   <!--DC-->
   <div class="difficulty-complexity">
      {item.system.difficulty}:{item.system.complexity}
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .check-label {
      @include flex-row;
      @include flex-group-center;
      @include attribute-colors;
      @include border;
      padding: 0.25rem;

      .skill-attribute {
         @include flex-row;
         @include flex-group-top;
      }

      .divider {
         @include border-left;
         height: 1rem;
         margin-left: 0.25rem;
         padding-right: 0.25rem;
      }

      .difficulty-complexity {
         @include flex-row;
         @include flex-group-center;
      }
   }
</style>
