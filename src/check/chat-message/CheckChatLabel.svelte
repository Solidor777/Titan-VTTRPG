<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   export let check = void 0;

   function getLabelClass() {
      switch (check.type) {
         case "resistanceCheck": {
            return check.parameters.resistance;
         }
         case "attributeCheck": {
            return check.parameters.attribute;
         }
         case "skillCheck": {
            return check.parameters.attribute;
         }
         case "attackCheck": {
            return check.parameters.attribute;
         }
         case "castingCheck": {
            return check.parameters.attribute;
         }
         case "itemCheck": {
            return check.parameters.attribute;
         }
         default: {
            return "";
         }
      }
   }

   function getMainLabel() {
      switch (check.type) {
         case "attributeCheck": {
            return `${localize(check.parameters.attribute)} ${check.parameters.difficulty}:${
               check.parameters.complexity
            }`;
         }
         case "resistanceCheck":
         case "skillCheck": {
            return check.typeLabel;
         }
         default: {
            return "TODO";
         }
      }
   }

   const mainLAbel = getMainLabel();
</script>

<div class="label {getLabelClass()}">
   <!--Image-->
   {#if check.parameters.img}
      <img src={check.parameters.img} alt="item" />
   {/if}

   <div class="label-text">
      <!--Type Label -->
      <div class="main-label">
         {mainLAbel}
      </div>

      <!--Sub Label -->
      {#if check.subLabels}
         {#each check.subLabels as subLabel}
            <div class="sub-label">
               {subLabel}
            </div>
         {/each}
      {/if}
   </div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      @include border;
      @include attribute-colors;
      @include resistance-colors;
      padding: 0.5rem;
      font-weight: bold;

      .label-text {
         @include flex-column;
         align-items: flex-start;
         justify-content: center;

         .main-label {
            @include flex-row;
            @include flex-group-center;
            @include font-size-large;
            height: 100%;
            font-weight: bold;
         }

         .sub-label {
            margin-top: 0.25rem;
         }
      }

      img {
         margin-right: 0.25rem;
         width: 2rem;
         border: none;
      }
   }
</style>
