<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   const document = getContext("DocumentSheetObject");

   // Item reference
   export let item = void 0;
</script>

<div class="armor-stats">
   <div class="stat">
      {localize(`LOCAL.armor.label`)}: {item.system.armor}
   </div>

   {#each item.system.traits as trait}
      <div class="stat">
         {localize(`LOCAL.${trait.name}.label`)}
         {#if trait.type === "number"}
            {trait.value}
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .armor-stats {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;
      font-weight: bold;

      .stat {
         @include flex-row;
         @include flex-group-center;
         @include border;
         margin: 0.25rem;
         padding: 0.25rem;
         background-color: var(--label-background-color);
      }
   }
</style>
