<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   export let opposedCheck = void 0;
</script>

<!--Check label-->
<div class="check-label {opposedCheck.attribute}">
   <!--Label-->
   <div class="label main">
      {localize("LOCAL.opposedCheck.label")}
   </div>

   <!--Skill & Attribute-->
   <div class="label">
      {#if opposedCheck.skill && opposedCheck.skill !== "none"}
         {`${localize(`LOCAL.${opposedCheck.attribute}.label`)} (${localize(`LOCAL.${opposedCheck.skill}.label`)})`}
      {:else}
         {localize(`LOCAL.${opposedCheck.attribute}.label`)}
      {/if}
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
