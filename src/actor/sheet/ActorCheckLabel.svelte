<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   export let check = {
      attribute: "body",
      skill: "athletics",
      difficulty: 4,
      complexity: 0,
   };
</script>

<!--Check label-->
<div class="check-label {check.attribute}">
   <!--Skill & Attribute-->
   <div class="skill-attribute">
      {`${localize(`LOCAL.${check.attribute}.label`)} (${localize(`LOCAL.${check.skill}.label`)})`}
   </div>

   <!--DC-->
   <div class="difficulty-complexity">
      {check.difficulty}:{check.complexity}
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

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

      .difficulty-complexity {
         @include border-left;
         @include flex-row;
         @include flex-group-center;
         margin-left: 0.25rem;
         padding-left: 0.25rem;
      }
   }
</style>
