<script>
   import { localize } from "~/helpers/Utility.js";

   // Item reference
   export let item = void 0;
   console.log(item.system);
</script>

<div class="armor-stats">
   <div class="stat">
      {localize(`armor`)}: {item.system.armor}
   </div>

   {#each item.system.trait as trait}
      <div class="stat">
         {localize(`${trait.name}`)}
         {#if trait.type === "number"}
            {trait.value}
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";
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
