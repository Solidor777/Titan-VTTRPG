<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   const document = getContext("DocumentStore");

   // Item reference
   export let item = void 0;
</script>

<div class="armor-stats">
   <div class="stat">
      {localize(`armor`)}: {item.system.armor}
   </div>

   {#each item.system.traits as trait}
      <div class="stat">
         {localize(`${trait.name}`)}
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
         background: var(--label-background-color);
      }
   }
</style>
