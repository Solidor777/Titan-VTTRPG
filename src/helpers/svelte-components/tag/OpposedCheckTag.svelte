<script>
   import { localize } from "~/helpers/Utility.js";

   export let opposedCheck = void 0;
</script>

<!--Check label-->
<div class="check-label {opposedCheck.attribute}">
   <!--Label-->
   <div class="label main">
      {localize("opposedCheck")}
   </div>

   <!--Skill & Attribute-->
   <div class="label">
      {#if opposedCheck.skill && opposedCheck.skill !== "none"}
         {`${localize(`${opposedCheck.attribute}`)} (${localize(`${opposedCheck.skill}`)})`}
      {:else}
         {localize(`${opposedCheck.attribute}`)}
      {/if}
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

      .label {
         @include flex-row;
         @include flex-group-center;

         &:not(:first-child) {
            @include border-left;
            margin-left: 0.25rem;
            padding-left: 0.25rem;
         }

         &.main {
            font-weight: bold;
         }
      }
   }
</style>
