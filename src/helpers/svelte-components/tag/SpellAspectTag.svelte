<script>
   import { localize } from "~/helpers/Utility.js";

   // Spell aspect
   export let aspect = void 0;
</script>

<div class="aspect {aspect.resistanceCheck ? aspect.resistanceCheck : ''}">
   <!--Label-->
   <div class="stat  label">
      {aspect.label}
   </div>

   <!--Initial value-->
   {#if aspect.initialValue}
      <div class="stat">
         {typeof aspect.initialValue === `string` ? localize(`${aspect.initialValue}`) : aspect.initialValue}
         {#if aspect.scaling}
            {#if aspect.cost > 1}
               {`+ (${aspect.cost} / ${localize("extraSuccesses.short")})`}
            {:else}
               {`+ ${localize("extraSuccesses.short")}`}
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
            {localize(`${option}`)}
         </div>
      {/each}
   {/if}

   <!--Resistance Check-->
   {#if aspect.resistanceCheck}
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
      background: var(--label-background-color);
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
      }
   }
</style>
