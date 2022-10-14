<script>
   import { localize } from "~/helpers/Utility.js";

   // Spell aspect
   export let aspect = void 0;
</script>

<div class="aspect {aspect.resistanceCheck ? aspect.resistanceCheck : ''}">
   <!--Label-->
   <div class="stat label">
      <!--Icon-->
      {#if aspect.isDamage}
         <i class="fas fa-burst" />
      {/if}
      {#if aspect.isHealing}
         <i class="fas fa-heart" />
      {/if}

      {aspect.label}
   </div>

   <!--Initial value-->
   {#if aspect.initialValue}
      <div class="stat">
         <!--Scaling value-->
         {#if aspect.scaling}
            {aspect.initialValue}
            {#if aspect.cost > 1}
               {`+ (${aspect.cost} / ${localize("extraSuccesses.short")})`}
            {:else}
               {`+ ${localize("extraSuccesses.short")}`}
            {/if}
         {:else}
            <!--Non scaling value-->
            {localize(aspect.initialValue)}
         {/if}
      </div>
   {/if}

   <!--Resistance Check-->
   {#if aspect.resistanceCheck && aspect.resistanceCheck !== "none"}
      <div class="stat">
         {localize("resistedBy")}
         {localize(`${aspect.resistanceCheck}`)}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .aspect {
      @include flex-row;
      @include flex-group-center;
      @include resistance-colors;
      @include border;
      @include label;
      padding: 0.25rem;
      flex-wrap: wrap;

      .stat {
         @include flex-row;
         @include flex-group-center;

         &.label {
            font-weight: bold;
         }

         &:not(:first-child) {
            @include border-left;
            margin-left: 0.25rem;
            padding-left: 0.25rem;
         }

         i {
            margin-right: 0.25rem;
         }
      }
   }
</style>
