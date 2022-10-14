<script>
   import { localize } from "~/helpers/Utility.js";

   const labelIcons = {
      damage: "fas fa-burst",
      healing: "fas fa-heart",
      range: "fas fa-ruler",
      radius: "fas fa-bullseye",
      decreaseSpeed: "fas fa-person-running",
      increaseSpeed: "fas fa-person-running",
   };

   // Spell aspect
   export let aspect = void 0;
</script>

<div class="aspect {aspect.resistanceCheck ? aspect.resistanceCheck : ''}">
   <!--Label-->
   <div class="stat label">
      <!--Icon-->
      {#if labelIcons[aspect.label]}
         <i class={labelIcons[aspect.label]} />
      {/if}

      {localize(aspect.label)}
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
            {#if typeof aspect.initialValue === "string"}
               {localize(aspect.initialValue)}
            {:else}
               {aspect.initialValue}
            {/if}
         {/if}
      </div>
   {/if}

   <!--Options-->
   {#if aspect.allOptions}
      <!--All Options-->
      <div class="stat">
         {localize("all")}
      </div>
   {:else if aspect.option}
      {#each aspect.option as option}
         <!--Each option-->
         <div class="stat">
            {localize(option)}
         </div>
      {/each}
   {/if}

   <!--Resistance Check-->
   {#if aspect.resistanceCheck && aspect.resistanceCheck !== "none"}
      <div class="stat">
         {localize("resistedBy")}
         {localize(aspect.resistanceCheck)}
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
