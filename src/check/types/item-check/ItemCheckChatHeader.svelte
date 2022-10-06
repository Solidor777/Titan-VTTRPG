<script>
   import { localize } from "~/helpers/Utility.js";

   // Check reference
   export let check = void 0;
</script>

<div class="label">
   <div class="content {check.parameters.attribute}">
      <img src={check.parameters.img} alt="item" />

      <!--Labels-->
      <div class="labels">
         <!--Label-->
         <div class="label">
            {check.parameters.itemName}
         </div>

         <!--Type Label -->
         <div class="sub-label">
            {`${localize(check.parameters.attribute)} (${localize(check.parameters.skill)}) ${
               check.parameters.difficulty
            }:${check.parameters.complexity}`}
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-left;
         @include attribute-colors;
         @include border;
         padding: 0.5rem;
         font-weight: bold;

         img {
            width: 2rem;
            border: none;
            margin-right: 0.25rem;
         }

         .labels {
            @include flex-column;
            @include flex-group-top-left;
            .label {
               @include flex-row;
               @include font-size-large;
            }

            .sub-label {
               @include flex-row;
               @include font-size-small;
            }
         }
      }
   }
</style>
